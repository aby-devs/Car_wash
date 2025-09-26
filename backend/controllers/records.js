const { admin, service_db } = require('../configs/firebase_db');

// Test endpoint to verify backend is working
exports.test_records = async (req, res) => {
  try {
    
    // Get all records without any filtering
    const snapshot = await service_db.collection('records').limit(5).get();
    const records = [];
    
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      success: true,
      message: 'Test endpoint working',
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  }
};

// Helper function to generate service order ID
const generateServiceOrderId = async () => {
  const currentYear = new Date().getFullYear();
  const recordsRef = service_db.collection('records');
  
  // Get all records for the current year by querying createdAt field
  const startOfYear = new Date(currentYear, 0, 1); // January 1st
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999); // December 31st
  
  const snapshot = await recordsRef
    .where('createdAt', '>=', startOfYear)
    .where('createdAt', '<=', endOfYear)
    .get();
  
  const count = snapshot.size + 1;
  return `SO-${currentYear}-${count.toString().padStart(3, '0')}`;
};

// Add a new car wash record
exports.add_record = async (req, res) => {
  try {
    const {
      registrationNumber,
      carModel,
      vehicleType,
      services,
      amountPaid,
      paymentMethod,
      attendant,
      mpesaCode,
      date
    } = req.body;


    // Validate required fields
    if (!registrationNumber || !carModel || !services || !amountPaid || !paymentMethod || !attendant) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate M-Pesa code if payment method is M-Pesa
    if (paymentMethod === 'Mpesa' && !mpesaCode) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa transaction code is required for M-Pesa payments'
      });
    }

    // Generate service order ID
    const serviceOrderId = await generateServiceOrderId();

    // Create record data
    const now = new Date();
    const recordData = {
      id: serviceOrderId,
      registrationNumber: registrationNumber.trim().toUpperCase(),
      carModel: carModel.trim(),
      vehicleType: vehicleType || '', // Store vehicle type
      services: services.trim(),
      serviceOffered: services.trim(), // Also store serviceOffered for compatibility
      amountPaid: parseFloat(amountPaid),
      paymentMethod,
      attendant: attendant.trim(),
      date: date || now.toISOString().split('T')[0], // Use provided date or current date in YYYY-MM-DD format
      time: now.toLocaleTimeString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add M-Pesa code if provided
    if (paymentMethod === 'Mpesa' && mpesaCode) {
      recordData.mpesaCode = mpesaCode.trim().toUpperCase();
    }

    // Save to Firestore using the service order ID as the document ID
    const docRef = await service_db.collection('records').doc(serviceOrderId).set(recordData);

    // Automatically calculate and save commission based on daily revenue
    try {
      // Get all records for this attendant on this date to calculate daily revenue
      const attendantRecordsSnapshot = await service_db.collection('records')
        .where('attendant', '==', recordData.attendant)
        .where('date', '==', recordData.date)
        .get();
      
      // Calculate daily revenue including the current record
      let dailyRevenue = 0;
      attendantRecordsSnapshot.forEach(doc => {
        const record = doc.data();
        dailyRevenue += record.amountPaid;
      });
      dailyRevenue += recordData.amountPaid; // Include current record
      
      // Determine commission rate based on daily revenue
      const commissionRate = dailyRevenue >= 6000 ? 30 : 20;
      const commissionAmount = (recordData.amountPaid * commissionRate) / 100;
      
      
      const commissionData = {
        recordId: serviceOrderId,
        attendant: recordData.attendant,
        registrationNumber: recordData.registrationNumber,
        carModel: recordData.carModel,
        vehicleType: recordData.vehicleType,
        services: recordData.services,
        serviceOffered: recordData.serviceOffered,
        amountPaid: recordData.amountPaid,
        commissionAmount: commissionAmount,
        commissionRate: commissionRate,
        dailyRevenue: dailyRevenue, // Store daily revenue for reference
        date: recordData.date,
        time: recordData.time,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await service_db.collection('commissions').add(commissionData);
    } catch (commissionError) {
      console.error('Error saving commission:', commissionError);
      // Don't fail the record creation if commission fails
    }

    res.status(201).json({
      success: true,
      message: 'Car wash record added successfully',
      data: {
        id: docRef.id,
        ...recordData
      }
    });

  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all car wash records with optional filtering
exports.get_records = async (req, res) => {
  try {
    const { paymentMethod, attendant, startDate, endDate, limit = 100 } = req.query;
    
    
    let query = service_db.collection('records');

    // Apply filters - prioritize date range first, then other filters
    if (startDate) {
      const start = new Date(startDate);
      query = query.where('createdAt', '>=', start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      query = query.where('createdAt', '<=', end);
    }

    // Order by creation date (newest first) and limit
    query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));

    const snapshot = await query.get();
    let records = [];

    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });


    // Apply client-side filtering for fields that don't have composite indexes
    
    if (paymentMethod && paymentMethod !== 'All') {
      records = records.filter(record => record.paymentMethod === paymentMethod);
    }
    
    if (attendant) {
      records = records.filter(record => record.attendant === attendant);
    }


    res.status(200).json({
      success: true,
      message: 'Records retrieved successfully',
      data: records,
      count: records.length
    });

  } catch (error) {
    console.error('Error getting records:', error);
    console.error('Query parameters:', { status, paymentMethod, attendant, startDate, endDate, limit });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get a single record by ID
exports.get_record = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await service_db.collection('records').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Record retrieved successfully',
      data: {
        id: doc.id,
        ...doc.data()
      }
    });

  } catch (error) {
    console.error('Error getting record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update a car wash record
exports.update_record = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;

    // Add updated timestamp
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Validate M-Pesa code if payment method is M-Pesa
    if (updateData.paymentMethod === 'Mpesa' && !updateData.mpesaCode) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa transaction code is required for M-Pesa payments'
      });
    }

    // Update the record
    await service_db.collection('records').doc(id).update(updateData);

    // Get the updated record
    const updatedDoc = await service_db.collection('records').doc(id).get();

    res.status(200).json({
      success: true,
      message: 'Record updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });

  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Debug function to list all record IDs
exports.debug_all_ids = async (req, res) => {
  try {
    const allRecordsSnapshot = await service_db.collection('records').get();
    const records = [];
    
    allRecordsSnapshot.forEach(doc => {
      records.push({
        id: doc.id,
        registrationNumber: doc.data().registrationNumber,
        createdAt: doc.data().createdAt
      });
    });
    
    
    res.status(200).json({
      success: true,
      message: 'All record IDs retrieved',
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error('Error getting all record IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Calculate and save commission for a record
exports.calculate_and_save_commission = async (req, res) => {
  try {
    const { recordId } = req.params;
    
    
    // Get the record
    const recordDoc = await service_db.collection('records').doc(recordId).get();
    
    if (!recordDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }
    
    const record = recordDoc.data();
    
    // Get all records for this attendant on this date to calculate daily revenue
    const attendantRecordsSnapshot = await service_db.collection('records')
      .where('attendant', '==', record.attendant)
      .where('date', '==', record.date)
      .get();
    
    // Calculate daily revenue
    let dailyRevenue = 0;
    attendantRecordsSnapshot.forEach(doc => {
      const rec = doc.data();
      dailyRevenue += rec.amountPaid;
    });
    
    // Determine commission rate based on daily revenue
    const commissionRate = dailyRevenue >= 6000 ? 30 : 20;
    const commissionAmount = (record.amountPaid * commissionRate) / 100;
    
    
    // Create commission record
    const commissionData = {
      recordId: recordId,
      attendant: record.attendant,
      registrationNumber: record.registrationNumber,
      carModel: record.carModel,
      vehicleType: record.vehicleType,
      services: record.services,
      serviceOffered: record.serviceOffered,
      amountPaid: record.amountPaid,
      commissionAmount: commissionAmount,
      commissionRate: commissionRate,
      dailyRevenue: dailyRevenue, // Store daily revenue for reference
      date: record.date,
      time: record.time,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save commission to Firestore
    const commissionRef = await service_db.collection('commissions').add(commissionData);
    
    
    res.status(201).json({
      success: true,
      message: 'Commission calculated and saved successfully',
      data: {
        commissionId: commissionRef.id,
        ...commissionData
      }
    });
    
  } catch (error) {
    console.error('Error calculating commission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get commissions with optional filtering
exports.get_commissions = async (req, res) => {
  try {
    const { attendant, startDate, endDate, limit = 100 } = req.query;
    
    
    let query = service_db.collection('commissions');
    
    // Apply filters
    if (attendant) {
      query = query.where('attendant', '==', attendant);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      query = query.where('createdAt', '>=', start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.where('createdAt', '<=', end);
    }
    
    // Order by creation date (newest first) and limit
    query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));
    
    const snapshot = await query.get();
    let commissions = [];
    
    snapshot.forEach(doc => {
      commissions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    
    res.status(200).json({
      success: true,
      message: 'Commissions retrieved successfully',
      data: commissions,
      count: commissions.length
    });
    
  } catch (error) {
    console.error('Error getting commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete a commission record
exports.delete_commission = async (req, res) => {
  try {
    const { commissionId } = req.params;
    

    // Check if commission exists
    const commissionDoc = await service_db.collection('commissions').doc(commissionId).get();
    
    if (!commissionDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Commission not found'
      });
    }

    // Delete the commission record
    await service_db.collection('commissions').doc(commissionId).delete();
    
    
    res.status(200).json({
      success: true,
      message: 'Commission deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting commission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete a car wash record
exports.delete_record = async (req, res) => {
  try {
    const { id } = req.params;
    

    // Debug: List all existing record IDs
    const allRecordsSnapshot = await service_db.collection('records').get();
    const existingIds = [];
    allRecordsSnapshot.forEach(doc => {
      existingIds.push(doc.id);
    });

    const doc = await service_db.collection('records').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    await service_db.collection('records').doc(id).delete();

    res.status(200).json({
      success: true,
      message: 'Record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get dashboard analytics
exports.get_dashboard_stats = async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    // Get all records first, then filter by date on the server side
    // This is more reliable than Firestore date queries
    const snapshot = await service_db.collection('records')
      .orderBy('createdAt', 'desc')
      .get();
    
    const allRecords = [];
    snapshot.forEach(doc => {
      allRecords.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Filter records based on period
    const now = new Date();
    let filteredRecords = allRecords;

    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      filteredRecords = allRecords.filter(record => {
        let recordDate;
        if (record.createdAt && record.createdAt.toDate) {
          recordDate = record.createdAt.toDate();
        } else if (record.createdAt && record.createdAt._seconds) {
          recordDate = new Date(record.createdAt._seconds * 1000);
        } else {
          recordDate = new Date(record.date);
        }
        return recordDate >= startOfDay && recordDate <= endOfDay;
      });
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      filteredRecords = allRecords.filter(record => {
        let recordDate;
        if (record.createdAt && record.createdAt.toDate) {
          recordDate = record.createdAt.toDate();
        } else if (record.createdAt && record.createdAt._seconds) {
          recordDate = new Date(record.createdAt._seconds * 1000);
        } else {
          recordDate = new Date(record.date);
        }
        return recordDate >= startOfWeek;
      });
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      filteredRecords = allRecords.filter(record => {
        let recordDate;
        if (record.createdAt && record.createdAt.toDate) {
          recordDate = record.createdAt.toDate();
        } else if (record.createdAt && record.createdAt._seconds) {
          recordDate = new Date(record.createdAt._seconds * 1000);
        } else {
          recordDate = new Date(record.date);
        }
        return recordDate >= startOfMonth;
      });
    }

    const records = filteredRecords;

    // Calculate statistics
    const totalRevenue = records.reduce((sum, record) => sum + record.amountPaid, 0);
    const totalServices = records.length;
    const uniqueAttendants = [...new Set(records.map(record => record.attendant))];
    const averageService = totalServices > 0 ? totalRevenue / totalServices : 0;

    // Payment method breakdown
    const mpesaRecords = records.filter(r => r.paymentMethod === 'Mpesa');
    const cashRecords = records.filter(r => r.paymentMethod === 'Cash');
    const mpesaRevenue = mpesaRecords.reduce((sum, record) => sum + record.amountPaid, 0);
    const cashRevenue = cashRecords.reduce((sum, record) => sum + record.amountPaid, 0);

    // Staff performance
    const staffPerformance = uniqueAttendants.map(attendant => {
      const attendantRecords = records.filter(r => r.attendant === attendant);
      const attendantRevenue = attendantRecords.reduce((sum, r) => sum + r.amountPaid, 0);
      return {
        attendant,
        services: attendantRecords.length,
        revenue: attendantRevenue,
        averageService: attendantRecords.length > 0 ? attendantRevenue / attendantRecords.length : 0
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Recent records (last 5)
    const recentRecords = records
      .sort((a, b) => new Date(b.createdAt?.toDate?.() || b.date) - new Date(a.createdAt?.toDate?.() || a.date))
      .slice(0, 5);

    res.status(200).json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: {
        totalRevenue,
        totalServices,
        uniqueAttendants: uniqueAttendants.length,
        averageService,
        paymentBreakdown: {
          mpesa: {
            count: mpesaRecords.length,
            revenue: mpesaRevenue
          },
          cash: {
            count: cashRecords.length,
            revenue: cashRevenue
          }
        },
        staffPerformance,
        recentRecords
      }
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Search records
exports.search_records = async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchTerm = q.trim().toLowerCase();
    
    // Get all records and filter client-side for now
    // In production, you might want to use Algolia or similar for better search
    const snapshot = await service_db.collection('records')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit) * 2) // Get more records to filter
      .get();

    const records = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const searchableText = [
        data.registrationNumber,
        data.carModel,
        data.attendant,
        data.id,
        data.services
      ].join(' ').toLowerCase();

      if (searchableText.includes(searchTerm)) {
        records.push({
          id: doc.id,
          ...data
        });
      }
    });

    // Limit results
    const limitedRecords = records.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: limitedRecords,
      count: limitedRecords.length,
      query: searchTerm
    });

  } catch (error) {
    console.error('Error searching records:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
