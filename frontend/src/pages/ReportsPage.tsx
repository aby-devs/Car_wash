import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CarWashRecord } from "@/components/CarWashRecord";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Car, 
  CreditCard, 
  Filter,
  Download,
  RefreshCw,
  Calendar,
  FileText
} from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  totalVehicles: number;
  totalRecords: number;
  attendantStats: {
    name: string;
    vehicleCount: number;
    revenue: number;
    commission: number;
    commissionRate: number;
  }[];
  serviceStats: {
    service: string;
    vehicleType: string;
    count: number;
    revenue: number;
  }[];
  paymentMethodStats: {
    method: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];
  topAttendant: {
    name: string;
    vehicleCount: number;
  };
  leastAttendant: {
    name: string;
    vehicleCount: number;
  };
  highestCommissionAttendant: {
    name: string;
    commission: number;
  };
  lowestCommissionAttendant: {
    name: string;
    commission: number;
  };
  topService: {
    service: string;
    vehicleType: string;
    revenue: number;
  };
  leastService: {
    service: string;
    vehicleType: string;
    revenue: number;
  };
}

export function ReportsPage() {
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Filter states
  const [filters, setFilters] = useState({
    dateRange: 'full',
    selectedMonth: 'all',
    selectedWeek: 'all',
    selectedDay: ''
  });

  // Get current year for month selection
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, [filters]); // Reload data when filters change

  // Function to calculate date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // If specific day is selected
    if (filters.selectedDay) {
      return {
        startDate: filters.selectedDay,
        endDate: filters.selectedDay
      };
    }
    
    // If specific week is selected
    if (filters.selectedWeek && filters.selectedWeek !== 'all') {
      const [year, week] = filters.selectedWeek.split('-W');
      const startOfWeek = new Date(parseInt(year), 0, 1);
      const dayOfWeek = startOfWeek.getDay();
      const daysToAdd = (parseInt(week) - 1) * 7 - dayOfWeek + 1;
      startOfWeek.setDate(startOfWeek.getDate() + daysToAdd);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      };
    }
    
    // If specific month is selected - always use current year
    if (filters.selectedMonth && filters.selectedMonth !== 'all') {
      const month = parseInt(filters.selectedMonth);
      const startOfMonth = new Date(currentYear, month - 1, 1);
      const endOfMonth = new Date(currentYear, month, 0);
      
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      };
    }
    
    // Default to full report
    return {
      startDate: '',
      endDate: ''
    };
  };

  // Function to get display name for date range
  const getDateRangeDisplayName = () => {
    if (filters.selectedDay) {
      const date = new Date(filters.selectedDay);
      return `Day: ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    }
    
    if (filters.selectedWeek && filters.selectedWeek !== 'all') {
      const [year, week] = filters.selectedWeek.split('-W');
      return `Week ${week}, ${year}`;
    }
    
    if (filters.selectedMonth && filters.selectedMonth !== 'all') {
      const month = parseInt(filters.selectedMonth);
      const monthName = new Date(currentYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
      return `${monthName} ${currentYear}`;
    }
    
    return 'Full Report (All Time)';
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get date range based on selected period
      const dateRange = getDateRange();
      
      // Prepare API parameters
      const apiParams: any = { limit: 1000 };
      
      if (dateRange.startDate) apiParams.startDate = dateRange.startDate;
      if (dateRange.endDate) apiParams.endDate = dateRange.endDate;
      
      console.log('Reports API params:', apiParams);
      console.log('Selected filters:', filters);
      console.log('Date range:', dateRange);
      
      const response = await apiService.getRecords(apiParams);
      
      if (response.success && response.data) {
        setRecords(response.data);
        calculateAnalytics(response.data);
      } else {
        throw new Error(response.message || 'Failed to load records');
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast({
        title: "Error Loading Data",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (data: CarWashRecord[]) => {
    // Use all data as it's already filtered by date range from API
    const filteredData = data;

    // Calculate attendant statistics
    const attendantMap = new Map();
    const serviceMap = new Map();
    const paymentMap = new Map();

    filteredData.forEach(record => {
      // Attendant stats
      const attendant = record.attendant;
      if (!attendantMap.has(attendant)) {
        attendantMap.set(attendant, {
          name: attendant,
          vehicleCount: 0,
          revenue: 0,
          commission: 0,
          commissionRate: 0
        });
      }
      
      const attendantData = attendantMap.get(attendant);
      attendantData.vehicleCount++;
      attendantData.revenue += record.amountPaid;
      
      // Service stats
      const serviceKey = `${record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services)} - ${record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : 'Unknown')}`;
      if (!serviceMap.has(serviceKey)) {
        serviceMap.set(serviceKey, {
          service: record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services),
          vehicleType: record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : 'Unknown'),
          count: 0,
          revenue: 0
        });
      }
      
      const serviceData = serviceMap.get(serviceKey);
      serviceData.count++;
      serviceData.revenue += record.amountPaid;
      
      // Payment method stats
      const paymentMethod = record.paymentMethod;
      if (!paymentMap.has(paymentMethod)) {
        paymentMap.set(paymentMethod, {
          method: paymentMethod,
          count: 0,
          revenue: 0
        });
      }
      
      const paymentData = paymentMap.get(paymentMethod);
      paymentData.count++;
      paymentData.revenue += record.amountPaid;
    });

    // Calculate commissions for attendants
    attendantMap.forEach(attendant => {
      const commissionRate = attendant.revenue < 5000 ? 0.20 : 0.30;
      attendant.commission = attendant.revenue * commissionRate;
      attendant.commissionRate = commissionRate;
    });

    // Calculate payment method percentages
    const totalRecords = filteredData.length;
    paymentMap.forEach(payment => {
      payment.percentage = totalRecords > 0 ? (payment.count / totalRecords) * 100 : 0;
    });

    // Sort and find extremes
    const attendantStats = Array.from(attendantMap.values()).sort((a, b) => b.vehicleCount - a.vehicleCount);
    const serviceStats = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);
    const paymentMethodStats = Array.from(paymentMap.values()).sort((a, b) => b.count - a.count);

    const totalRevenue = filteredData.reduce((sum, record) => sum + record.amountPaid, 0);

    setAnalytics({
      totalRevenue,
      totalVehicles: filteredData.length,
      totalRecords: filteredData.length,
      attendantStats,
      serviceStats,
      paymentMethodStats,
      topAttendant: attendantStats[0] || { name: 'N/A', vehicleCount: 0 },
      leastAttendant: attendantStats[attendantStats.length - 1] || { name: 'N/A', vehicleCount: 0 },
      highestCommissionAttendant: attendantStats.sort((a, b) => b.commission - a.commission)[0] || { name: 'N/A', commission: 0 },
      lowestCommissionAttendant: attendantStats.sort((a, b) => a.commission - b.commission)[0] || { name: 'N/A', commission: 0 },
      topService: serviceStats[0] || { service: 'N/A', vehicleType: 'N/A', revenue: 0 },
      leastService: serviceStats[serviceStats.length - 1] || { service: 'N/A', vehicleType: 'N/A', revenue: 0 }
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadData();
  };

  const clearFilters = () => {
    setFilters({
      dateRange: 'full',
      selectedMonth: 'all',
      selectedWeek: 'all',
      selectedDay: ''
    });
    loadData();
  };

  const exportData = () => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for export
      const exportRecords = records.map(record => ({
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
        'Status': record.status || 'Completed'
      }));

      // Create the main data worksheet
      const dataWorksheet = XLSX.utils.json_to_sheet(exportRecords);
      
      // Set column widths
      const columnWidths = [
        { wch: 12 }, // Date
        { wch: 15 }, // Registration Number
        { wch: 20 }, // Car Model
        { wch: 15 }, // Vehicle Type
        { wch: 25 }, // Service Offered
        { wch: 15 }, // Amount Paid
        { wch: 12 }, // Payment Method
        { wch: 15 }, // Attendant
        { wch: 15 }, // M-Pesa Code
        { wch: 10 }, // Time
        { wch: 12 }  // Status
      ];
      dataWorksheet['!cols'] = columnWidths;

      // Add the data worksheet
      XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Car Wash Records');

      // Create summary data
      const summaryData = [];
      
      if (analytics) {
        // Header
        summaryData.push(['CAR WASH MANAGEMENT SYSTEM - ANALYTICS SUMMARY']);
        summaryData.push(['Generated on:', new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })]);
        summaryData.push(['Period:', getDateRangeDisplayName()]);
        summaryData.push([]); // Empty row

        // Key Metrics
        summaryData.push(['KEY PERFORMANCE INDICATORS']);
        summaryData.push(['Total Revenue (KSh)', analytics.totalRevenue.toLocaleString()]);
        summaryData.push(['Total Vehicles Washed', analytics.totalVehicles]);
        summaryData.push(['Total Records', analytics.totalRecords]);
        summaryData.push(['Active Attendants', analytics.attendantStats.length]);
        summaryData.push(['Average Revenue per Vehicle (KSh)', analytics.totalVehicles ? Math.round(analytics.totalRevenue / analytics.totalVehicles) : 0]);
        summaryData.push([]); // Empty row

        // Top Performers
        summaryData.push(['TOP PERFORMING ATTENDANTS']);
        summaryData.push(['Rank', 'Attendant', 'Services', 'Revenue (KSh)', 'Commission (KSh)', 'Commission Rate (%)']);
        analytics.attendantStats.slice(0, 5).forEach((attendant, index) => {
          summaryData.push([
            index + 1,
            attendant.name,
            attendant.vehicleCount,
            attendant.revenue.toLocaleString(),
            attendant.commission.toLocaleString(),
            Math.round(attendant.commissionRate * 100)
          ]);
        });
        summaryData.push([]); // Empty row

        // Payment Method Analysis
        summaryData.push(['PAYMENT METHOD ANALYSIS']);
        summaryData.push(['Payment Method', 'Transactions', 'Revenue (KSh)', 'Percentage (%)']);
        analytics.paymentMethodStats.forEach(payment => {
          summaryData.push([
            payment.method,
            payment.count,
            payment.revenue.toLocaleString(),
            payment.percentage.toFixed(1)
          ]);
        });
        summaryData.push([]); // Empty row

        // Service Performance
        summaryData.push(['SERVICE PERFORMANCE']);
        summaryData.push(['Service', 'Vehicle Type', 'Count', 'Revenue (KSh)']);
        analytics.serviceStats.slice(0, 10).forEach(service => {
          summaryData.push([
            service.service,
            service.vehicleType,
            service.count,
            service.revenue.toLocaleString()
          ]);
        });
      }

      // Create summary worksheet
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths for summary
      summaryWorksheet['!cols'] = [
        { wch: 20 }, // First column
        { wch: 25 }, // Second column
        { wch: 15 }, // Third column
        { wch: 15 }  // Fourth column
      ];

      // Add the summary worksheet
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary & Analytics');

      // Generate filename
      const filename = `car-wash-report-${getDateRangeDisplayName().replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write the file
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Excel Export Successful",
        description: "Data exported as Excel file with headers, data, and summary",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Excel Export Failed",
        description: "Could not generate Excel file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);
      
      // Create a new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Helper function to add text with word wrapping
      const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };

      // Helper function to add a line
      const addLine = (y: number) => {
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, y, pageWidth - 20, y);
        return y + 5;
      };

      // Helper function to add a section header
      const addSectionHeader = (title: string, y: number) => {
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        y = addText(title, 20, y, pageWidth - 40, 16);
        y = addLine(y);
        return y + 5;
      };

      // Helper function to add a metric
      const addMetric = (label: string, value: string, y: number) => {
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(100, 100, 100);
        y = addText(label, 20, y, pageWidth - 40, 10);
        
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        y = addText(value, 20, y + 3, pageWidth - 40, 12);
        return y + 8;
      };

      // Header
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      yPosition = addText('Car Wash Management System', 20, yPosition, pageWidth - 40, 20);
      
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100, 100, 100);
      yPosition = addText('Analytics & Reports', 20, yPosition + 5, pageWidth - 40, 14);
      
      pdf.setFontSize(10);
      yPosition = addText(`Generated on: ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 20, yPosition + 3, pageWidth - 40, 10);
      
      yPosition = addText(`Period: ${getDateRangeDisplayName()}`, 20, yPosition + 3, pageWidth - 40, 10);
      
      yPosition = addLine(yPosition + 5);

      // Key Metrics Section
      if (analytics) {
        yPosition = addSectionHeader('Key Performance Indicators', yPosition);
        
        yPosition = addMetric('Total Revenue', `KSh ${analytics.totalRevenue.toLocaleString()}`, yPosition);
        yPosition = addMetric('Total Vehicles Washed', analytics.totalVehicles.toString(), yPosition);
        yPosition = addMetric('Total Records', analytics.totalRecords.toString(), yPosition);
        yPosition = addMetric('Average Revenue per Vehicle', `KSh ${((analytics as any).averageRevenuePerVehicle || 0).toLocaleString()}`, yPosition);
        
        yPosition = addLine(yPosition + 5);
      }

      // Top Performers Section
      if (analytics && (analytics as any).topPerformers && (analytics as any).topPerformers.length > 0) {
        yPosition = addSectionHeader('Top Performers', yPosition);
        
        (analytics as any).topPerformers.forEach((performer: any, index: number) => {
          yPosition = addMetric(
            `${index + 1}. ${performer.name}`,
            `${performer.vehicles} vehicles • KSh ${performer.revenue.toLocaleString()} • ${performer.commissionRate}% commission`,
            yPosition
          );
        });
        
        yPosition = addLine(yPosition + 5);
      }

      // Service Analysis Section
      if (analytics && (analytics as any).serviceAnalysis && (analytics as any).serviceAnalysis.length > 0) {
        yPosition = addSectionHeader('Service Performance Analysis', yPosition);
        
        (analytics as any).serviceAnalysis.forEach((service: any, index: number) => {
          yPosition = addMetric(
            `${index + 1}. ${service.name}`,
            `${service.count} services • KSh ${service.revenue.toLocaleString()} • ${service.percentage.toFixed(1)}% of total`,
            yPosition
          );
        });
        
        yPosition = addLine(yPosition + 5);
      }

      // Payment Method Analysis
      if (analytics && (analytics as any).paymentAnalysis && (analytics as any).paymentAnalysis.length > 0) {
        yPosition = addSectionHeader('Payment Method Analysis', yPosition);
        
        (analytics as any).paymentAnalysis.forEach((payment: any, index: number) => {
          yPosition = addMetric(
            `${index + 1}. ${payment.method}`,
            `${payment.count} transactions • KSh ${payment.amount.toLocaleString()} • ${payment.percentage.toFixed(1)}% of total`,
            yPosition
          );
        });
        
        yPosition = addLine(yPosition + 5);
      }

      // Recent Records Section (if there's space)
      if (records.length > 0 && yPosition < pageHeight - 100) {
        yPosition = addSectionHeader('Recent Records (Sample)', yPosition);
        
        const sampleRecords = records.slice(0, 10); // Show first 10 records
        sampleRecords.forEach((record, index) => {
          const vehicleType = record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : '-');
          const service = record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services);
          
          yPosition = addMetric(
            `${index + 1}. ${record.registrationNumber}`,
            `${vehicleType} • ${service} • KSh ${record.amountPaid.toLocaleString()} • ${record.attendant}`,
            yPosition
          );
        });
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text('Generated by Car Wash Management System', 20, pageHeight - 10);
      pdf.text(`Page 1 of 1`, pageWidth - 30, pageHeight - 10);

      // Save the PDF
      const fileName = `car-wash-analysis-${getDateRangeDisplayName().replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "PDF Export Successful",
        description: "Analysis exported as PDF file",
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Export Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
  return (
    <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-sm sm:text-base text-gray-600">Comprehensive analysis of your car wash business</p>
          <p className="text-xs sm:text-sm text-blue-600 font-medium mt-1">
            📅 {getDateRangeDisplayName()}
          </p>
        </div>
        <div className="flex space-x-1 sm:space-x-2">
          <Button onClick={exportData} variant="outline" size="sm" className="text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" disabled={loading} className="text-xs sm:text-sm">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button onClick={loadData} variant="outline" size="sm" className="text-xs sm:text-sm">
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </Button>
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Select Time Period
          </CardTitle>
          <CardDescription>Choose specific days or months to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month Selection */}
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={filters.selectedMonth} onValueChange={(value) => {
                setFilters(prev => ({ ...prev, selectedMonth: value, selectedWeek: 'all', selectedDay: '' }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(currentYear, i, 1);
                    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                    return (
                      <SelectItem key={i} value={String(i + 1)}>
                        {monthName} {currentYear}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Day Selection */}
            <div>
              <Label htmlFor="day">Day</Label>
              <Input
                id="day"
                type="date"
                value={filters.selectedDay}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, selectedDay: e.target.value, selectedMonth: 'all', selectedWeek: 'all' }));
                }}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={clearFilters} variant="outline">
              Clear Selection
            </Button>
            <Button onClick={() => setFilters(prev => ({ ...prev, selectedMonth: 'all', selectedWeek: 'all', selectedDay: '' }))}>
              Full Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-6">
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2 sm:pb-2 sm:px-3 sm:pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-xs md:text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-green-50">
              <DollarSign className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3 md:px-6 md:pb-6">
            <div className="text-sm sm:text-lg md:text-2xl font-bold text-green-600">
              KSh {analytics?.totalRevenue.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total earnings
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2 sm:pb-2 sm:px-3 sm:pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-xs md:text-sm font-medium text-muted-foreground">
              Total Vehicles
            </CardTitle>
            <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-blue-50">
              <Car className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3 md:px-6 md:pb-6">
            <div className="text-sm sm:text-lg md:text-2xl font-bold">
              {analytics?.totalVehicles || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vehicles washed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2 sm:pb-2 sm:px-3 sm:pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-xs md:text-sm font-medium text-muted-foreground">
              Active Attendants
            </CardTitle>
            <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-purple-50">
              <Users className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3 md:px-6 md:pb-6">
            <div className="text-sm sm:text-lg md:text-2xl font-bold">
              {analytics?.attendantStats.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Staff members
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2 sm:pb-2 sm:px-3 sm:pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-xs md:text-sm font-medium text-muted-foreground">
              Avg. Revenue/Vehicle
            </CardTitle>
            <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-orange-50">
              <CreditCard className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3 md:px-6 md:pb-6">
            <div className="text-sm sm:text-lg md:text-2xl font-bold text-orange-600">
              KSh {analytics?.totalVehicles ? Math.round(analytics.totalRevenue / analytics.totalVehicles).toLocaleString() : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per vehicle average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Attendant Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Attendant Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Most Vehicles</p>
                <p className="font-bold text-green-600">{analytics?.topAttendant.name}</p>
                <p className="text-sm text-gray-500">{analytics?.topAttendant.vehicleCount} vehicles</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Least Vehicles</p>
                <p className="font-bold text-red-600">{analytics?.leastAttendant.name}</p>
                <p className="text-sm text-gray-500">{analytics?.leastAttendant.vehicleCount} vehicles</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Highest Commission</p>
                <p className="font-bold text-blue-600">{analytics?.highestCommissionAttendant.name}</p>
                <p className="text-sm text-gray-500">KSh {analytics?.highestCommissionAttendant.commission.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Lowest Commission</p>
                <p className="font-bold text-orange-600">{analytics?.lowestCommissionAttendant.name}</p>
                <p className="text-sm text-gray-500">KSh {analytics?.lowestCommissionAttendant.commission.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Car className="h-5 w-5 mr-2" />
              Service Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-gray-600">Top Revenue Service</p>
                <p className="font-bold text-green-600 text-sm sm:text-base">{analytics?.topService.service}</p>
                <p className="text-xs sm:text-sm text-gray-500">{analytics?.topService.vehicleType}</p>
                <p className="text-xs sm:text-sm text-gray-500">KSh {analytics?.topService.revenue.toLocaleString()}</p>
              </div>
              
              <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg">
                <TrendingDown className="h-4 w-4 sm:h-6 sm:w-6 text-red-600 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-gray-600">Lowest Revenue Service</p>
                <p className="font-bold text-red-600 text-sm sm:text-base">{analytics?.leastService.service}</p>
                <p className="text-xs sm:text-sm text-gray-500">{analytics?.leastService.vehicleType}</p>
                <p className="text-xs sm:text-sm text-gray-500">KSh {analytics?.leastService.revenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Attendant Details */}
        <Card>
          <CardHeader>
            <CardTitle>Attendant Breakdown</CardTitle>
            <CardDescription>Detailed performance metrics for each attendant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.attendantStats.slice(0, 5).map((attendant, index) => (
                <div key={attendant.name} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{attendant.name}</p>
                    <p className="text-sm text-gray-500">{attendant.vehicleCount} vehicles</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">KSh {attendant.revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Commission: KSh {attendant.commission.toLocaleString()}</p>
                    <Badge variant={attendant.commissionRate === 0.30 ? "default" : "secondary"}>
                      {Math.round(attendant.commissionRate * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Analysis</CardTitle>
            <CardDescription>Revenue breakdown by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.paymentMethodStats.map((payment, index) => (
                <div key={payment.method} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    <span className="font-medium">{payment.method}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{payment.count} transactions</p>
                    <p className="text-sm text-gray-500">KSh {payment.revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{payment.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Details */}
      <Card>
        <CardHeader>
          <CardTitle>Service Revenue Analysis</CardTitle>
          <CardDescription>Revenue breakdown by service type and vehicle type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Service</th>
                  <th className="text-left p-3 font-semibold">Vehicle Type</th>
                  <th className="text-right p-3 font-semibold">Count</th>
                  <th className="text-right p-3 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.serviceStats.slice(0, 10).map((service, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3">{service.service}</td>
                    <td className="p-3">
                      <Badge variant="outline">{service.vehicleType}</Badge>
                    </td>
                    <td className="p-3 text-right">{service.count}</td>
                    <td className="p-3 text-right font-medium text-green-600">
                      KSh {service.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
