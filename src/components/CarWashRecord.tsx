import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, CreditCard, User, Search, Filter, Download, Edit, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface CarWashRecord {
  id: string;
  registrationNumber: string;
  carModel: string;
  services: string;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Mpesa';
  attendant: string;
  date: string;
  time: string;
  status?: 'Completed' | 'Pending' | 'In Progress';
  mpesaCode?: string;
}

interface CarWashRecordFormProps {
  onAddRecord: (record: Omit<CarWashRecord, 'id'>) => void;
}

interface ServiceManagementProps {
  records: CarWashRecord[];
  onAddRecord: (record: Omit<CarWashRecord, 'id'>) => void;
}

export function ServiceManagement({ records, onAddRecord }: ServiceManagementProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const [formData, setFormData] = useState({
    registrationNumber: '',
    carModel: '',
    services: '',
    amountPaid: '',
    paymentMethod: '' as 'Cash' | 'Mpesa' | '',
    attendant: '',
    mpesaCode: ''
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

    if (formData.paymentMethod === 'Mpesa' && !formData.mpesaCode) {
      toast({
        title: "Missing M-Pesa Code",
        description: "Please enter the M-Pesa transaction code.",
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
      attendant: '',
      mpesaCode: ''
    });

    setShowForm(false);
    toast({
      title: "Service Record Added",
      description: "Car wash service has been successfully recorded.",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.carModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
          <p className="text-gray-600">Manage car wash services, track revenue, and monitor transactions</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Record
        </Button>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by registration number or service ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Orders</CardTitle>
          <CardDescription>View and manage all car wash service transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Registration Number</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Amount (KSh)</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>M-Pesa Code</TableHead>
                <TableHead>Attempt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No service records found. Click "Add New Record" to add your first record.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                    <TableCell>{record.registrationNumber}</TableCell>
                    <TableCell>{record.carModel}</TableCell>
                    <TableCell className="max-w-xs truncate">{record.services}</TableCell>
                    <TableCell>KSh {record.amountPaid.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.paymentMethod === 'Mpesa' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {record.paymentMethod === 'Mpesa' ? 'M-Pesa' : 'Cash'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.paymentMethod === 'Mpesa' && record.mpesaCode ? (
                        <span className="font-mono text-sm">{record.mpesaCode}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{record.attendant}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="relative border-b">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Plus className="h-5 w-5" />
                Add New Car Wash Service
              </CardTitle>
              <CardDescription className="text-gray-600">
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
                    <Label htmlFor="services">Services Offered</Label>
                    <Input
                      id="services"
                      placeholder="e.g., Exterior wash, Interior cleaning, Waxing..."
                      value={formData.services}
                      onChange={(e) => handleInputChange('services', e.target.value)}
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

                  {formData.paymentMethod === 'Mpesa' && (
                    <div className="space-y-2">
                      <Label htmlFor="mpesaCode">M-Pesa Code</Label>
                      <Input
                        id="mpesaCode"
                        placeholder="Enter M-Pesa transaction code"
                        value={formData.mpesaCode}
                        onChange={(e) => handleInputChange('mpesaCode', e.target.value)}
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  )}
                </div>



                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Plus className="mr-2 h-4 w-4" />
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