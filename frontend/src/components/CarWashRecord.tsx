import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, CreditCard, User, Search, Filter, Edit, Trash2, X, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  status?: 'Completed' | 'Pending' | 'In Progress';
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
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All Payment');

  const [formData, setFormData] = useState({
    registrationNumber: '',
    carModel: '',
    vehicleType: '' as 'Saloon' | 'Saloon Detailed' | 'Saloon Simple' | '4x4/SUV' | '4x4/SUV Simple' | '4x4/SUV Detailed' | '',
    serviceOffered: '',
    amountPaid: '',
    paymentMethod: '' as 'Cash' | 'Mpesa' | '',
    attendant: '',
    mpesaCode: ''
  });

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
    
    if (!formData.registrationNumber || !formData.carModel || !formData.vehicleType || 
        !formData.serviceOffered || !formData.amountPaid || !formData.paymentMethod || !formData.attendant) {
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

    const record: Omit<CarWashRecord, 'id' | 'date' | 'time' | 'status' | 'createdAt' | 'updatedAt'> = {
      registrationNumber: formData.registrationNumber,
      carModel: formData.carModel,
      services: `${formData.vehicleType} - ${formData.serviceOffered}`,
      vehicleType: formData.vehicleType,
      serviceOffered: formData.serviceOffered,
      amountPaid: parseFloat(formData.amountPaid),
      paymentMethod: formData.paymentMethod as 'Cash' | 'Mpesa',
      attendant: formData.attendant,
      ...(formData.paymentMethod === 'Mpesa' && formData.mpesaCode && { mpesaCode: formData.mpesaCode })
    };

    await onAddRecord(record);
    
    // Reset form
    setFormData({
      registrationNumber: '',
      carModel: '',
      vehicleType: '' as 'Saloon' | 'Saloon Detailed' | 'Saloon Simple' | '4x4/SUV' | '4x4/SUV Simple' | '4x4/SUV Detailed' | '',
      serviceOffered: '',
      amountPaid: '',
      paymentMethod: '' as 'Cash' | 'Mpesa' | '',
      attendant: '',
      mpesaCode: ''
    });

    setShowForm(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Calculate price when vehicle type or service changes
      if (field === 'vehicleType' || field === 'serviceOffered') {
        const vehicleType = field === 'vehicleType' ? value : newData.vehicleType;
        const service = field === 'serviceOffered' ? value : newData.serviceOffered;
        
        if (vehicleType && service) {
          const price = getServicePrice(vehicleType, service);
          newData.amountPaid = price > 0 ? price.toString() : '';
        }
      }
      
      return newData;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
    // Fallback to date field
    return new Date(b.date).getTime() - new Date(a.date).getTime();
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
        matchesDate = recordDate.toDateString() === filterDate.toDateString();
      } catch (error) {
        // If date parsing fails, don't filter by date
        matchesDate = true;
      }
    }
    
    const matchesPayment = paymentFilter === 'All Payment' || record.paymentMethod === paymentFilter;
    return matchesSearch && matchesDate && matchesPayment;
  });

  // Calculate summary statistics
  const totalRevenue = filteredRecords.reduce((sum, record) => sum + record.amountPaid, 0);
  const totalServices = filteredRecords.length;
  const mpesaCount = filteredRecords.filter(r => r.paymentMethod === 'Mpesa').length;
  const cashCount = filteredRecords.filter(r => r.paymentMethod === 'Cash').length;
  const mpesaRevenue = filteredRecords.filter(r => r.paymentMethod === 'Mpesa').reduce((sum, record) => sum + record.amountPaid, 0);
  const cashRevenue = filteredRecords.filter(r => r.paymentMethod === 'Cash').reduce((sum, record) => sum + record.amountPaid, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
        <Button 
          onClick={() => setShowForm(true)} 
          size="default"
          className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 text-sm font-semibold self-start"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Services
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
              Total Revenue
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
              M-Pesa
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
              Cash
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
              <CardTitle className="text-xl font-bold text-gray-900">Service Orders</CardTitle>
              <CardDescription className="text-sm text-gray-600">View and manage all car wash service transactions</CardDescription>
            </div>
            
            {/* Filters inside table header */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-48 h-9 text-sm"
                />
              </div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-40 h-9 text-sm"
                placeholder="Filter by date"
              />
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
              <div className="text-center py-8 text-gray-500 px-4">
                No service records found. Click "Add New Record" to add your first record.
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
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        <div className="text-lg font-semibold mb-2">No service records found</div>
                        <div className="text-sm">Click "Add New Record" to add your first record.</div>
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
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
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
          <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl border-4">
            <CardHeader className="relative border-b-2 bg-gradient-to-r from-blue-50 to-blue-100 px-8 pt-8 pb-6">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100 h-10 w-10 rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
              <CardTitle className="flex items-center gap-3 text-gray-900 text-2xl md:text-3xl font-bold">
                <Plus className="h-8 w-8" />
                Add New Car Wash Service
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg mt-2">
                Record details of the car wash service provided
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="registrationNumber" className="text-lg font-semibold text-gray-700">
                      Registration Number
                    </Label>
                    <Input
                      id="registrationNumber"
                      placeholder="e.g., KCA 123A"
                      value={formData.registrationNumber}
                      onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                      className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="carModel" className="text-lg font-semibold text-gray-700">
                      Car Model
                    </Label>
                    <Input
                      id="carModel"
                      placeholder="e.g., Toyota Camry"
                      value={formData.carModel}
                      onChange={(e) => handleInputChange('carModel', e.target.value)}
                      className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="vehicleType" className="text-lg font-semibold text-gray-700">
                      Vehicle Type
                    </Label>
                    <Select
                      value={formData.vehicleType}
                      onValueChange={(value) => handleInputChange('vehicleType', value)}
                    >
                      <SelectTrigger className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl">
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

                  <div className="space-y-3">
                    <Label htmlFor="serviceOffered" className="text-lg font-semibold text-gray-700">
                      Service Offered
                    </Label>
                    <Select
                      value={formData.serviceOffered}
                      onValueChange={(value) => handleInputChange('serviceOffered', value)}
                    >
                      <SelectTrigger className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Engine Steam Wash">Engine Steam Wash</SelectItem>
                        <SelectItem value="Under Wash">Under Wash</SelectItem>
                        <SelectItem value="Executive Wash">Executive Wash</SelectItem>
                        <SelectItem value="Vacuum">Vacuum</SelectItem>
                        <SelectItem value="Vacuum and shampoo">Vacuum and shampoo</SelectItem>
                        <SelectItem value="Leather Care Cleaner">Leather Care Cleaner</SelectItem>
                        <SelectItem value="Dashboard Shine">Dashboard Shine</SelectItem>
                        <SelectItem value="Executive Machine Polish">Executive Machine Polish</SelectItem>
                        <SelectItem value="Executive Buffing">Executive Buffing</SelectItem>
                        <SelectItem value="Air-con Refill">Air-con Refill</SelectItem>
                        <SelectItem value="Water Marks">Water Marks</SelectItem>
                        <SelectItem value="Rim Restoration">Rim Restoration</SelectItem>
                        <SelectItem value="Engine Wash">Engine Wash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="amountPaid" className="text-lg font-semibold text-gray-700">
                      Amount Paid (KSh) - Auto-calculated
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
                      className="h-14 bg-gray-50 text-lg border-2 focus:border-blue-500 rounded-xl [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      readOnly={formData.vehicleType && formData.serviceOffered}
                    />
                    {formData.vehicleType && formData.serviceOffered && (
                      <p className="text-sm text-gray-500">
                        Price automatically calculated. You can edit if needed.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="paymentMethod" className="text-lg font-semibold text-gray-700">
                      Payment Method
                    </Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                      <SelectTrigger className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Mpesa">M-Pesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="attendant" className="text-lg font-semibold text-gray-700">
                      Attendant
                    </Label>
                    <Select
                      value={formData.attendant}
                      onValueChange={(value) => handleInputChange('attendant', value)}
                    >
                      <SelectTrigger className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl">
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
                    <div className="space-y-3">
                      <Label htmlFor="mpesaCode" className="text-lg font-semibold text-gray-700">
                        M-Pesa Code
                      </Label>
                      <Input
                        id="mpesaCode"
                        placeholder="Enter M-Pesa transaction code"
                        value={formData.mpesaCode}
                        onChange={(e) => handleInputChange('mpesaCode', e.target.value)}
                        className="h-14 text-lg border-2 focus:border-blue-500 rounded-xl"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-center pt-6">
                  <Button 
                    type="submit" 
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white h-16 px-12 text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                  >
                    <Plus className="mr-3 h-6 w-6" />
                    Add Service
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
      time: now.toLocaleTimeString(),
      status: 'Pending'
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
            className="w-full bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}