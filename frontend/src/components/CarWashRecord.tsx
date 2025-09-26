import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, CreditCard, User, Search, Filter, Edit, Trash2, X, DollarSign, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api";
import * as XLSX from 'xlsx';

export interface CarWashRecord {
  id: string;
  registrationNumber: string;
  carModel: string;
  services: string;
  vehicleType?: string;
  serviceOffered?: string;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Mpesa';
  attendant: string;
  date: string;
  time: string;
  mpesaCode?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface DashboardStats {
  totalRevenue: number;
  totalServices: number;
  uniqueAttendants: number;
  averageService: number;
  paymentBreakdown: {
    mpesa: {
      count: number;
      revenue: number;
    };
    cash: {
      count: number;
      revenue: number;
    };
  };
  staffPerformance: Array<{
    attendant: string;
    services: number;
    revenue: number;
    averageService: number;
  }>;
  recentRecords: CarWashRecord[];
}

interface CarWashRecordFormProps {
  onAddRecord: (record: Omit<CarWashRecord, 'id' | 'date' | 'time' | 'status' | 'createdAt' | 'updatedAt'>) => void;
}

interface ServiceManagementProps {
  records: CarWashRecord[];
  onAddRecord: (record: Omit<CarWashRecord, 'id' | 'date' | 'time' | 'status' | 'createdAt' | 'updatedAt'>) => void;
}

export function ServiceManagement({ records, onAddRecord }: ServiceManagementProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    // Use East Africa Time (EAT, UTC+3)
    const today = new Date();
    const eatOffset = 3 * 60; // 3 hours in minutes
    const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
    const eatTime = new Date(utc + (eatOffset * 60000));
    
    const year = eatTime.getFullYear();
    const month = String(eatTime.getMonth() + 1).padStart(2, '0');
    const day = String(eatTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [paymentFilter, setPaymentFilter] = useState('All Payment');
  const [editingRecord, setEditingRecord] = useState<CarWashRecord | null>(null);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServiceDropdownOpen(false);
      }
    };

    if (isServiceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isServiceDropdownOpen]);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    carModel: '',
    vehicleType: '' as 'Saloon' | 'Saloon Detailed' | 'Saloon Simple' | '4x4/SUV' | '4x4/SUV Simple' | '4x4/SUV Detailed' | '',
    serviceOffered: [] as string[],
    amountPaid: '',
    paymentMethod: '' as 'Cash' | 'Mpesa' | '',
    attendant: '',
    mpesaCode: '',
    date: (() => {
      // Use East Africa Time (EAT, UTC+3)
      const today = new Date();
      const eatOffset = 3 * 60; // 3 hours in minutes
      const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
      const eatTime = new Date(utc + (eatOffset * 60000));
      
      const year = eatTime.getFullYear();
      const month = String(eatTime.getMonth() + 1).padStart(2, '0');
      const day = String(eatTime.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })() // Will be updated when dateFilter changes
  });


  // Update form date when dateFilter changes
  useEffect(() => {
    if (dateFilter) {
      setFormData(prev => ({
        ...prev,
        date: dateFilter
      }));
    }
  }, [dateFilter]);

  // Pricing configuration based on the price list
  const getServicePrice = (vehicleType: string, service: string): number => {
    const pricing: { [key: string]: { [key: string]: number } } = {
      'Engine Steam Wash': {
        'Saloon': 1500,
        '4x4/SUV': 1800
      },
      'Under Wash': {
        'Saloon': 500,
        '4x4/SUV': 600
      },
      'Executive Wash': {
        'Saloon Detailed': 4000,
        'Saloon Simple': 2000,
        '4x4/SUV Detailed': 5000,
        '4x4/SUV Simple': 3000
      },
      'Vacuum': {
        'Saloon': 2000, // Default to Wet
        '4x4/SUV': 2000, // Default to Wet
        'Saloon Detailed': 2000,
        'Saloon Simple': 400, // Dry
        '4x4/SUV Detailed': 2000,
        '4x4/SUV Simple': 400 // Dry
      },
      'Vacuum and shampoo': {
        'Saloon': 2000,
        '4x4/SUV': 2500
      },
      'Leather Care Cleaner': {
        'Saloon': 400,
        '4x4/SUV': 500
      },
      'Dashboard Shine': {
        'Saloon': 400,
        '4x4/SUV': 500
      },
      'Executive Machine Polish': {
        'Saloon': 1500,
        '4x4/SUV': 1800
      },
      'Executive Buffing': {
        'Saloon': 4000,
        '4x4/SUV': 5000
      },
      'Air-con Refill': {
        'Saloon': 4000,
        '4x4/SUV': 4000,
        'Saloon Detailed': 4000,
        'Saloon Simple': 4000,
        '4x4/SUV Detailed': 4000,
        '4x4/SUV Simple': 4000
      },
      'Water Marks': {
        'Saloon': 2000,
        '4x4/SUV': 2000,
        'Saloon Detailed': 2000,
        'Saloon Simple': 2000,
        '4x4/SUV Detailed': 2000,
        '4x4/SUV Simple': 2000
      },
      'Rim Restoration': {
        'Saloon': 2000,
        '4x4/SUV': 2000,
        'Saloon Detailed': 2000,
        'Saloon Simple': 2000,
        '4x4/SUV Detailed': 2000,
        '4x4/SUV Simple': 2000
      },
      'Engine Wash': {
        'Saloon': 400,
        '4x4/SUV': 500
      }
    };

    return pricing[service]?.[vehicleType] || 0;
  };

  // Calculate total price for multiple services
  const getTotalServicePrice = (vehicleType: string, services: string[]): number => {
    if (!vehicleType || !services || services.length === 0) return 0;
    
    return services.reduce((total, service) => {
      return total + getServicePrice(vehicleType, service);
    }, 0);
  };

  // Calculate price when vehicle type or service changes
  const calculatePrice = (vehicleType: string, service: string) => {
    const price = getServicePrice(vehicleType, service);
    setFormData(prev => ({
      ...prev,
      amountPaid: price > 0 ? price.toString() : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      if (!formData.registrationNumber || !formData.carModel || !formData.vehicleType || 
          !formData.serviceOffered || formData.serviceOffered.length === 0 || !formData.amountPaid || !formData.paymentMethod || !formData.attendant || !formData.date) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      if (formData.paymentMethod === 'Mpesa' && !formData.mpesaCode) {
        toast({
          title: "Missing M-Pesa Code",
          description: "Please enter the M-Pesa transaction code.",
          variant: "destructive"
        });
        return;
      }


    const record: Omit<CarWashRecord, 'id' | 'time' | 'status' | 'createdAt' | 'updatedAt'> = {
      registrationNumber: formData.registrationNumber,
      carModel: formData.carModel,
      services: `${formData.vehicleType} - ${formData.serviceOffered.join(', ')}`,
      vehicleType: formData.vehicleType,
      serviceOffered: formData.serviceOffered.join(', '),
      amountPaid: parseFloat(formData.amountPaid),
      paymentMethod: formData.paymentMethod as 'Cash' | 'Mpesa',
      attendant: formData.attendant,
      date: formData.date, // Use the date from form data
      ...(formData.paymentMethod === 'Mpesa' && formData.mpesaCode && { mpesaCode: formData.mpesaCode })
    };

    if (editingRecord) {
      // Handle edit logic
      try {
        const response = await apiService.updateRecord(editingRecord.id, record);
        
        if (response.success) {
          toast({
            title: "Record Updated",
            description: "The service record has been updated successfully.",
          });
          window.location.reload(); // Simple refresh for now
        } else {
          console.error('Update failed with response:', response);
          throw new Error(response.message || 'Failed to update record');
        }
      } catch (error) {
        console.error('Error updating record:', error);
        console.error('Full error object:', error);
        
        // Check if it's a network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
          toast({
            title: "Network Error",
            description: "Unable to connect to the server. Please check your internet connection and try again.",
            variant: "destructive"
          });
        } else {
        toast({
          title: "Error Updating Record",
          description: error instanceof Error ? error.message : 'Failed to update record',
          variant: "destructive"
        });
        }
        return; // Don't close the form if there's an error
      }
      } else {
        await onAddRecord(record);
      }
      
      resetForm();
      setShowForm(false);
    } catch (error) {
      // Error handling is already done in the individual try-catch blocks above
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      
      // Calculate price when vehicle type or service changes
      if (field === 'vehicleType' || field === 'serviceOffered') {
        const vehicleType = field === 'vehicleType' ? value as string : newData.vehicleType;
        const services = field === 'serviceOffered' ? value as string[] : newData.serviceOffered;
        
        if (vehicleType && services && services.length > 0) {
          const price = getTotalServicePrice(vehicleType, services);
          newData.amountPaid = price > 0 ? price.toString() : '';
        }
      }
      
      return newData;
    });
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => {
      const currentServices = prev.serviceOffered;
      const newServices = currentServices.includes(service)
        ? currentServices.filter(s => s !== service)
        : [...currentServices, service];
      
      const newData = { ...prev, serviceOffered: newServices };
      
      // Calculate total price for all selected services
      if (prev.vehicleType && newServices.length > 0) {
        const price = getTotalServicePrice(prev.vehicleType, newServices);
        newData.amountPaid = price > 0 ? price.toString() : '';
      } else {
        newData.amountPaid = '';
      }
      
      return newData;
    });
    
    // Keep dropdown open for multiple selections
    // setIsServiceDropdownOpen(false);
  };

  const handleEditRecord = (record: CarWashRecord) => {
    setEditingRecord(record);
    
    
    // Convert date to YYYY-MM-DD format for the date input
    let dateValue = record.date;
    try {
      if (record.date && !record.date.includes('-')) {
        // If date is in DD/MM/YYYY format, convert to YYYY-MM-DD
        const date = new Date(record.date);
        if (!isNaN(date.getTime())) {
          dateValue = date.toISOString().split('T')[0];
        }
      }
    } catch (error) {
      console.error('Date conversion error:', error);
    }
    
    // Parse services - try both serviceOffered and services fields
    let servicesArray: string[] = [];
    if (record.serviceOffered) {
      servicesArray = record.serviceOffered.split(', ').map(s => s.trim());
    } else if (record.services) {
      // If serviceOffered is not available, try to parse from services field
      // Services field format: "VehicleType - Service1, Service2, Service3"
      const servicesPart = record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services;
      servicesArray = servicesPart.split(', ').map(s => s.trim());
    }
    
    
    // Parse vehicle type - try to extract from services field if vehicleType is missing
    let vehicleType = record.vehicleType || '';
    if (!vehicleType && record.services && record.services.includes(' - ')) {
      vehicleType = record.services.split(' - ')[0];
    }
    
    
    setFormData({
      registrationNumber: record.registrationNumber,
      carModel: record.carModel,
      vehicleType: vehicleType as 'Saloon' | 'Saloon Detailed' | 'Saloon Simple' | '4x4/SUV' | '4x4/SUV Simple' | '4x4/SUV Detailed' | '',
      serviceOffered: servicesArray,
      amountPaid: record.amountPaid.toString(),
      paymentMethod: record.paymentMethod,
      attendant: record.attendant,
      mpesaCode: record.mpesaCode || '',
      date: dateValue || new Date().toISOString().split('T')[0]
    });
    setShowForm(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      setDeletingRecordId(recordId);
      try {
        const response = await apiService.deleteRecord(recordId);
        
        if (response.success) {
          toast({
            title: "Record Deleted",
            description: "The service record has been deleted successfully.",
          });
          // Refresh the records list by calling the parent's onRefresh if available
          // or we could emit an event to refresh the data
          window.location.reload(); // Simple refresh for now
        } else {
          console.error('Delete failed with response:', response);
          throw new Error(response.message || 'Failed to delete record');
        }
      } catch (error) {
        console.error('Error deleting record:', error);
        console.error('Record ID that failed:', recordId);
        console.error('Full error object:', error);
        
        // Check if it's a network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
          toast({
            title: "Network Error",
            description: "Unable to connect to the server. Please check your internet connection and try again.",
            variant: "destructive"
          });
        } else {
        toast({
          title: "Error Deleting Record",
          description: `Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
        }
      } finally {
        setDeletingRecordId(null);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      registrationNumber: '',
      carModel: '',
      vehicleType: '' as 'Saloon' | 'Saloon Detailed' | 'Saloon Simple' | '4x4/SUV' | '4x4/SUV Simple' | '4x4/SUV Detailed' | '',
      serviceOffered: [],
      amountPaid: '',
      paymentMethod: '' as 'Cash' | 'Mpesa' | '',
      attendant: '',
      mpesaCode: '',
      date: dateFilter || new Date().toISOString().split('T')[0] // Use selected date filter or today
    });
    setEditingRecord(null);
  };

  const formatDate = (dateString: string) => {
    try {
      // Handle different date formats
      let date;
      if (dateString.includes('/')) {
        // Handle DD/MM/YYYY or MM/DD/YYYY format
        const parts = dateString.split('/');
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        // Handle YYYY-MM-DD format (from date input)
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString; // Return original string if error
    }
  };

  // Sort records with latest added at the top
  const sortedRecords = [...records].sort((a, b) => {
    // First try to sort by createdAt if available
    if (a.createdAt && b.createdAt) {
      if (a.createdAt.toDate && b.createdAt.toDate) {
        return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
      }
      return b.createdAt - a.createdAt;
    }
    // Fallback to date field - handle different date formats
    try {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // Check if dates are valid
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        // If dates are invalid, sort by string comparison
        return b.date.localeCompare(a.date);
      }
      
      return dateB.getTime() - dateA.getTime();
    } catch (error) {
      console.error('Date sorting error:', error);
      return 0; // Keep original order if sorting fails
    }
  });

  const filteredRecords = sortedRecords.filter(record => {
    const matchesSearch = record.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.attendant.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filtering - convert record date to YYYY-MM-DD format for comparison
    let matchesDate = true;
    if (dateFilter) {
      try {
        const recordDate = new Date(record.date);
        const filterDate = new Date(dateFilter);
        
        // Check if dates are valid
        if (!isNaN(recordDate.getTime()) && !isNaN(filterDate.getTime())) {
          matchesDate = recordDate.toDateString() === filterDate.toDateString();
        } else {
          // If date parsing fails, don't filter by date
          matchesDate = true;
        }
      } catch (error) {
        // If date parsing fails, don't filter by date
        matchesDate = true;
      }
    }
    
    const matchesPayment = paymentFilter === 'All Payment' || record.paymentMethod === paymentFilter;
    return matchesSearch && matchesDate && matchesPayment;
  });

  // Use the filtered records directly (already includes date filtering)
  const todayRecords = filteredRecords;

  // Calculate summary statistics for selected date
  const totalRevenue = todayRecords.reduce((sum, record) => sum + record.amountPaid, 0);
  const totalServices = todayRecords.length;
  const mpesaCount = todayRecords.filter(r => r.paymentMethod === 'Mpesa').length;
  const cashCount = todayRecords.filter(r => r.paymentMethod === 'Cash').length;
  const mpesaRevenue = todayRecords.filter(r => r.paymentMethod === 'Mpesa').reduce((sum, record) => sum + record.amountPaid, 0);
  const cashRevenue = todayRecords.filter(r => r.paymentMethod === 'Cash').reduce((sum, record) => sum + record.amountPaid, 0);


  const exportServicesToExcel = async () => {
    try {
      // Get all services for the current month
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Get start and end dates for current month
      const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`;

      // Fetch all records for the month
      const response = await apiService.getRecords({
        startDate: startOfMonth,
        endDate: endOfMonth,
        limit: 1000
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch service data');
      }

      const monthlyRecords = response.data;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Prepare service data
      const serviceData = monthlyRecords.map((record: any, index: number) => ({
        'No.': index + 1,
        'Date': record.date,
        'Registration Number': record.registrationNumber,
        'Car Model': record.carModel,
        'Vehicle Type': record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : '-'),
        'Service Offered': record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services),
        'Amount Paid (KSh)': record.amountPaid,
        'Payment Method': record.paymentMethod,
        'Attendant': record.attendant,
        'M-Pesa Code': record.mpesaCode || '-',
        'Time': record.time || '-',
      }));

      // Create service worksheet
      const serviceWorksheet = XLSX.utils.json_to_sheet(serviceData);
      
      // Set column widths
      serviceWorksheet['!cols'] = [
        { wch: 5 },  // No.
        { wch: 12 }, // Date
        { wch: 18 }, // Registration Number
        { wch: 20 }, // Car Model
        { wch: 15 }, // Vehicle Type
        { wch: 25 }, // Service Offered
        { wch: 15 }, // Amount Paid
        { wch: 15 }, // Payment Method
        { wch: 18 }, // Attendant
        { wch: 15 }, // M-Pesa Code
        { wch: 10 }  // Time
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, serviceWorksheet, 'Service Records');

      // Create summary data
      const summaryData = [];
      
      // Header
      summaryData.push(['SERVICE RECORDS SUMMARY']);
      summaryData.push(['Generated on:', new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })]);
      summaryData.push(['Period:', `${new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', { month: 'long' })} ${currentYear}`]);
      summaryData.push([]); // Empty row

      // Summary metrics
      const totalRevenue = monthlyRecords.reduce((sum: number, r: any) => sum + r.amountPaid, 0);
      const uniqueVehicles = [...new Set(monthlyRecords.map((r: any) => r.registrationNumber))].length;
      const uniqueStaff = [...new Set(monthlyRecords.map((r: any) => r.attendant))].length;
      const averageOrderValue = monthlyRecords.length > 0 ? totalRevenue / monthlyRecords.length : 0;

      summaryData.push(['MONTHLY SUMMARY']);
      summaryData.push(['Metric', 'Value']);
      summaryData.push(['Total Service Records', monthlyRecords.length]);
      summaryData.push(['Total Revenue (KSh)', totalRevenue.toLocaleString()]);
      summaryData.push(['Unique Vehicles Served', uniqueVehicles]);
      summaryData.push(['Active Staff Members', uniqueStaff]);
      summaryData.push(['Average Order Value (KSh)', averageOrderValue.toLocaleString()]);
      summaryData.push([]); // Empty row

      // Service type breakdown
      const serviceMap = new Map();
      monthlyRecords.forEach((record: any) => {
        const service = record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services);
        const vehicleType = record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : 'Unknown');
        const key = `${service} - ${vehicleType}`;
        
        if (!serviceMap.has(key)) {
          serviceMap.set(key, {
            service,
            vehicleType,
            count: 0,
            revenue: 0
          });
        }
        const serviceData = serviceMap.get(key);
        serviceData.count += 1;
        serviceData.revenue += record.amountPaid;
      });

      const serviceStats = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);

      summaryData.push(['SERVICE TYPE BREAKDOWN']);
      summaryData.push(['Service', 'Vehicle Type', 'Count', 'Revenue (KSh)', 'Avg per Service (KSh)']);
      serviceStats.forEach(service => {
        const avgPerService = service.count > 0 ? service.revenue / service.count : 0;
        summaryData.push([
          service.service,
          service.vehicleType,
          service.count,
          service.revenue.toLocaleString(),
          avgPerService.toLocaleString()
        ]);
      });
      summaryData.push([]); // Empty row

      // Staff performance breakdown
      const staffMap = new Map();
      monthlyRecords.forEach((record: any) => {
        if (!staffMap.has(record.attendant)) {
          staffMap.set(record.attendant, {
            name: record.attendant,
            count: 0,
            revenue: 0
          });
        }
        const staff = staffMap.get(record.attendant);
        staff.count += 1;
        staff.revenue += record.amountPaid;
      });

      const staffStats = Array.from(staffMap.values()).sort((a, b) => b.revenue - a.revenue);

      summaryData.push(['STAFF PERFORMANCE BREAKDOWN']);
      summaryData.push(['Staff Member', 'Services', 'Revenue (KSh)', 'Avg per Service (KSh)']);
      staffStats.forEach(staff => {
        const avgPerService = staff.count > 0 ? staff.revenue / staff.count : 0;
        summaryData.push([
          staff.name,
          staff.count,
          staff.revenue.toLocaleString(),
          avgPerService.toLocaleString()
        ]);
      });

      // Create summary worksheet
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths for summary
      summaryWorksheet['!cols'] = [
        { wch: 25 }, // First column
        { wch: 20 }, // Second column
        { wch: 15 }, // Third column
        { wch: 15 }  // Fourth column
      ];

      // Add summary worksheet
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Generate filename
      const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', { month: 'long' });
      const filename = `service-records-${monthName.toLowerCase()}-${currentYear}.xlsx`;

      // Write file
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Excel Export Successful",
        description: `Service data exported for ${monthName} ${currentYear}`,
      });

    } catch (error) {
      console.error('Error exporting services:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Service Management</h1>
          <p className="text-base text-gray-600">Manage car wash services, track revenue, and monitor transactions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={exportServicesToExcel} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Monthly Excel
          </Button>
          <Button 
            onClick={() => setShowForm(true)} 
            size="default"
            className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 text-sm font-semibold"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Record
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Services ({dateFilter ? new Date(dateFilter).toLocaleDateString() : 'Today'})
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50">
              <Car className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{totalServices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredRecords.length} filtered
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue ({dateFilter ? new Date(dateFilter).toLocaleDateString() : 'Today'})
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-50">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-green-600">KSh {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalServices > 0 ? `Avg: KSh ${Math.round(totalRevenue / totalServices).toLocaleString()}` : 'No services'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              M-Pesa ({dateFilter ? new Date(dateFilter).toLocaleDateString() : 'Today'})
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-50">
              <CreditCard className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{mpesaCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              KSh {mpesaRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash ({dateFilter ? new Date(dateFilter).toLocaleDateString() : 'Today'})
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{cashCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              KSh {cashRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">📖 Daily Service Book</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                View and manage car wash service transactions for {dateFilter ? new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'today'}
              </CardDescription>
            </div>
            
            {/* Daily Book Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search this day's records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-48 h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">📅</span>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full sm:w-40 h-9 text-sm border-2 border-blue-200 focus:border-blue-400"
                  placeholder="Select date"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const eatOffset = 3 * 60; // 3 hours in minutes
                    const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
                    const eatTime = new Date(utc + (eatOffset * 60000));
                    
                    const year = eatTime.getFullYear();
                    const month = String(eatTime.getMonth() + 1).padStart(2, '0');
                    const day = String(eatTime.getDate()).padStart(2, '0');
                    setDateFilter(`${year}-${month}-${day}`);
                  }}
                  className="h-9 px-3 text-xs"
                >
                  Today
                </Button>
              </div>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Payment">All Payment</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Mpesa">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                  setPaymentFilter('All Payment');
                }}
                className="w-full sm:w-auto h-9 text-sm"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500 px-4">
                <div className="text-6xl mb-4">📖</div>
                <div className="text-lg font-semibold mb-2">Clean Daily Book</div>
                <div className="text-sm">
                  No services recorded for {dateFilter ? new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'today'} yet.
                </div>
                <div className="text-sm mt-2 text-blue-600">
                  Click "Add New Record" to start the day's entries.
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 space-y-2 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm">{record.registrationNumber}</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.paymentMethod === 'Mpesa' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {record.paymentMethod === 'Mpesa' ? 'M-Pesa' : 'Cash'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">{record.carModel}</div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Vehicle Type:</span> {record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : '-')}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      <span className="font-medium">Service:</span> {record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services)}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">KSh {record.amountPaid.toLocaleString()}</span>
                      <span className="text-gray-500">{formatDate(record.date)}</span>
                    </div>
                    {record.paymentMethod === 'Mpesa' && record.mpesaCode && (
                      <div className="text-xs text-gray-500 font-mono">{record.mpesaCode}</div>
                    )}
                    <div className="text-xs text-gray-500">Attendant: {record.attendant}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold py-4 px-4">Date</TableHead>
                    <TableHead className="font-semibold py-4 px-4">Registration</TableHead>
                    <TableHead className="font-semibold py-4 px-4">Model</TableHead>
                    <TableHead className="font-semibold py-4 px-4">Vehicle Type</TableHead>
                    <TableHead className="font-semibold py-4 px-4">Service</TableHead>
                    <TableHead className="font-semibold py-4 px-4 text-right">Amount</TableHead>
                    <TableHead className="font-semibold py-4 px-4 text-center">Payment</TableHead>
                    <TableHead className="font-semibold py-4 px-4 text-center">M-Pesa Code</TableHead>
                    <TableHead className="font-semibold py-4 px-4">Attendant</TableHead>
                    <TableHead className="font-semibold py-4 px-4 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        <div className="text-6xl mb-4">📖</div>
                        <div className="text-lg font-semibold mb-2">Clean Daily Book</div>
                        <div className="text-sm mb-2">
                          No services recorded for {dateFilter ? new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'today'} yet.
                        </div>
                        <div className="text-sm text-blue-600">
                          Click "Add New Record" to start the day's entries.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium py-4 px-4">{formatDate(record.date)}</TableCell>
                        <TableCell className="font-medium py-4 px-4">{record.registrationNumber}</TableCell>
                        <TableCell className="py-4 px-4">{record.carModel}</TableCell>
                        <TableCell className="py-4 px-4">
                          <Badge variant="outline" className="text-xs">
                            {record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : '-')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs py-4 px-4">
                          <div className="truncate" title={record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services)}>
                            {record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600 py-4 px-4">
                          KSh {record.amountPaid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center py-4 px-4">
                          <Badge 
                            variant={record.paymentMethod === 'Mpesa' ? 'default' : 'secondary'}
                            className={`text-xs ${record.paymentMethod === 'Mpesa' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-blue-100 text-blue-800 hover:bg-blue-100'}`}
                          >
                            {record.paymentMethod === 'Mpesa' ? 'M-Pesa' : 'Cash'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-4 px-4">
                          {record.paymentMethod === 'Mpesa' && record.mpesaCode ? (
                            <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{record.mpesaCode}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4">{record.attendant}</TableCell>
                        <TableCell className="text-center py-4 px-4">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRecord(record)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRecord(record.id)}
                              disabled={deletingRecordId === record.id}
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingRecordId === record.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <CardHeader className="relative border-b px-6 pt-6 pb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="flex items-center gap-2 text-gray-900 text-xl font-bold">
                <Plus className="h-5 w-5" />
                {editingRecord ? 'Edit Car Wash Service' : 'Add New Car Wash Service'}
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm mt-1">
                Record details of the car wash service provided
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => {
                        handleInputChange('date', e.target.value);
                      }}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber" className="text-sm font-medium text-gray-700">
                      Registration Number *
                    </Label>
                    <Input
                      id="registrationNumber"
                      placeholder="e.g., KCA 123A"
                      value={formData.registrationNumber}
                      onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carModel" className="text-sm font-medium text-gray-700">
                      Car Model *
                    </Label>
                    <Input
                      id="carModel"
                      placeholder="e.g., Toyota Camry"
                      value={formData.carModel}
                      onChange={(e) => handleInputChange('carModel', e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleType" className="text-sm font-medium text-gray-700">
                      Vehicle Type *
                    </Label>
                    <Select
                      value={formData.vehicleType}
                      onValueChange={(value) => handleInputChange('vehicleType', value)}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Saloon">Saloon</SelectItem>
                        <SelectItem value="Saloon Detailed">Saloon Detailed</SelectItem>
                        <SelectItem value="Saloon Simple">Saloon Simple</SelectItem>
                        <SelectItem value="4x4/SUV">4x4/SUV</SelectItem>
                        <SelectItem value="4x4/SUV Simple">4x4/SUV Simple</SelectItem>
                        <SelectItem value="4x4/SUV Detailed">4x4/SUV Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceOffered" className="text-sm font-medium text-gray-700">
                      Services Offered * (Select multiple)
                    </Label>
                    <div className="relative" ref={serviceDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className={formData.serviceOffered.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                            {formData.serviceOffered.length > 0 
                              ? `${formData.serviceOffered.length} service(s) selected` 
                              : "Select services"
                            }
                          </span>
                          {formData.serviceOffered.length > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                              {formData.serviceOffered.length}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`h-4 w-4 opacity-50 transition-transform ${isServiceDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isServiceDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          <div className="p-1">
                            {[
                              'Engine Steam Wash',
                              'Under Wash',
                              'Executive Wash',
                              'Vacuum',
                              'Vacuum and shampoo',
                              'Leather Care Cleaner',
                              'Dashboard Shine',
                              'Executive Machine Polish',
                              'Executive Buffing',
                              'Air-con Refill',
                              'Water Marks',
                              'Rim Restoration',
                              'Engine Wash'
                            ].map((service) => (
                              <div 
                                key={service} 
                                className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded-sm"
                                onClick={() => handleServiceToggle(service)}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.serviceOffered.includes(service)}
                                  onChange={() => handleServiceToggle(service)}
                                  className="rounded border-gray-300 text-primary focus:ring-primary"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-sm text-gray-700">{service}</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2">
                              <button
                                type="button"
                                onClick={() => setIsServiceDropdownOpen(false)}
                                className="w-full text-center py-2 text-sm text-primary hover:bg-gray-100 rounded"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {formData.serviceOffered.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Selected: {formData.serviceOffered.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amountPaid" className="text-sm font-medium text-gray-700">
                      Amount Paid (KSh) - Auto-calculated *
                    </Label>
                    <Input
                      id="amountPaid"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0.00"
                      value={formData.amountPaid}
                      onChange={(e) => {
                        // Only allow numbers and decimal point
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        handleInputChange('amountPaid', value);
                      }}
                      className="h-10 bg-gray-50 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      readOnly={Boolean(formData.vehicleType && formData.serviceOffered.length > 0)}
                    />
                    {formData.vehicleType && formData.serviceOffered.length > 0 && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Price automatically calculated. You can edit if needed.</p>
                        <div className="bg-gray-100 p-2 rounded text-xs">
                          <div className="font-medium mb-1">Price Breakdown:</div>
                          {formData.serviceOffered.map(service => (
                            <div key={service} className="flex justify-between">
                              <span>{service}:</span>
                              <span>KSh {getServicePrice(formData.vehicleType, service).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="border-t pt-1 mt-1 font-medium flex justify-between">
                            <span>Total:</span>
                            <span>KSh {getTotalServicePrice(formData.vehicleType, formData.serviceOffered).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">
                      Payment Method *
                    </Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Mpesa">M-Pesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="attendant" className="text-sm font-medium text-gray-700">
                      Attendant *
                    </Label>
                    <Select
                      value={formData.attendant}
                      onValueChange={(value) => handleInputChange('attendant', value)}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select attendant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jacktone Asinuli">Jacktone Asinuli</SelectItem>
                        <SelectItem value="Celeb Nyogesa">Celeb Nyogesa</SelectItem>
                        <SelectItem value="Nelson Simiyo">Nelson Simiyo</SelectItem>
                        <SelectItem value="Mutua Frecon">Mutua Frecon</SelectItem>
                        <SelectItem value="Amos Mokua">Amos Mokua</SelectItem>
                        <SelectItem value="Victor Onyango">Victor Onyango</SelectItem>
                        <SelectItem value="Howard Ruenya">Howard Ruenya</SelectItem>
                        <SelectItem value="Japeth Musyoka">Japeth Musyoka</SelectItem>
                        <SelectItem value="Boneuture Okot">Boneuture Okot</SelectItem>
                        <SelectItem value="Jairus Esichupa">Jairus Esichupa</SelectItem>
                        <SelectItem value="Chris Okeno">Chris Okeno</SelectItem>
                        <SelectItem value="Alex Utti Mwilu">Alex Utti Mwilu</SelectItem>
                        <SelectItem value="Zudin Odida">Zudin Odida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.paymentMethod === 'Mpesa' && (
                    <div className="space-y-2">
                      <Label htmlFor="mpesaCode" className="text-sm font-medium text-gray-700">
                        M-Pesa Code *
                      </Label>
                      <Input
                        id="mpesaCode"
                        placeholder="Enter M-Pesa transaction code"
                        value={formData.mpesaCode}
                        onChange={(e) => handleInputChange('mpesaCode', e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    size="default"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingRecord ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        {editingRecord ? 'Update Service' : 'Add Service'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function CarWashRecordForm({ onAddRecord }: CarWashRecordFormProps) {
  // Keep the original form for backward compatibility
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    registrationNumber: '',
    carModel: '',
    services: '',
    amountPaid: '',
    paymentMethod: '' as 'Cash' | 'Mpesa' | '',
    attendant: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.registrationNumber || !formData.carModel || !formData.services || 
        !formData.amountPaid || !formData.paymentMethod || !formData.attendant) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const now = new Date();
    const record: Omit<CarWashRecord, 'id'> = {
      ...formData,
      amountPaid: parseFloat(formData.amountPaid),
      paymentMethod: formData.paymentMethod as 'Cash' | 'Mpesa',
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString()
    };

    onAddRecord(record);
    
    // Reset form
    setFormData({
      registrationNumber: '',
      carModel: '',
      services: '',
      amountPaid: '',
      paymentMethod: '' as 'Cash' | 'Mpesa' | '',
      attendant: ''
    });

    toast({
      title: "Record Added",
      description: "Car wash record has been successfully recorded.",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground">
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Car Wash Record
        </CardTitle>
        <CardDescription className="text-primary-foreground/80">
          Record details of the car wash service provided
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Registration Number
              </Label>
              <Input
                id="registrationNumber"
                placeholder="e.g., KCA 123A"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carModel">Car Model</Label>
              <Input
                id="carModel"
                placeholder="e.g., Toyota Camry"
                value={formData.carModel}
                onChange={(e) => handleInputChange('carModel', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountPaid" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Amount Paid (KSh)
              </Label>
              <Input
                id="amountPaid"
                type="number"
                placeholder="0.00"
                value={formData.amountPaid}
                onChange={(e) => handleInputChange('amountPaid', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Mpesa">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendant" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Attempt
              </Label>
              <Input
                id="attendant"
                placeholder="Person name"
                value={formData.attendant}
                onChange={(e) => handleInputChange('attendant', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="services">Services Offered</Label>
            <Textarea
              id="services"
              placeholder="e.g., Exterior wash, Interior cleaning, Waxing..."
              value={formData.services}
              onChange={(e) => handleInputChange('services', e.target.value)}
              className="min-h-[80px] transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Record
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}