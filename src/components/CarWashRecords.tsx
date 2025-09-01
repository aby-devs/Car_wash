import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Calendar, User, Car, CreditCard, Clock, Filter } from "lucide-react";
import { CarWashRecord } from "./CarWashRecord";

interface CarWashRecordsProps {
  records: CarWashRecord[];
}

export function CarWashRecords({ records }: CarWashRecordsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState<"All" | "Cash" | "Mpesa">("All");

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.carModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.attendant.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPayment = filterPayment === "All" || record.paymentMethod === filterPayment;
    
    return matchesSearch && matchesPayment;
  });

  // Enhanced analytics
  const totalRevenue = records.reduce((sum, record) => sum + record.amountPaid, 0);
  const todayRecords = records.filter(record => record.date === new Date().toLocaleDateString());
  const weeklyRevenue = filteredRecords.reduce((sum, record) => sum + record.amountPaid, 0);
  const averageTransaction = filteredRecords.length > 0 ? weeklyRevenue / filteredRecords.length : 0;
  
  // Top performing metrics
  const uniqueAttendants = [...new Set(records.map(record => record.attendant))];
  const topAttendant = uniqueAttendants.reduce((top, attendant) => {
    const count = records.filter(r => r.attendant === attendant).length;
    const topCount = records.filter(r => r.attendant === top).length;
    return count > topCount ? attendant : top;
  }, uniqueAttendants[0] || "N/A");
  
  // Payment method breakdown
  const mpesaCount = filteredRecords.filter(r => r.paymentMethod === 'Mpesa').length;
  const cashCount = filteredRecords.filter(r => r.paymentMethod === 'Cash').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Business Reports & Analytics
            </CardTitle>
            <CardDescription>
              Comprehensive reporting and detailed analysis of car wash operations
            </CardDescription>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-primary/10 rounded-lg p-3">
              <div className="text-xl font-bold text-primary">{filteredRecords.length}</div>
              <div className="text-xs text-muted-foreground">Filtered Records</div>
            </div>
            <div className="bg-success/10 rounded-lg p-3">
              <div className="text-xl font-bold text-success">KSh {weeklyRevenue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Filtered Revenue</div>
            </div>
            <div className="bg-accent/10 rounded-lg p-3">
              <div className="text-xl font-bold text-accent">KSh {averageTransaction.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">Avg Transaction</div>
            </div>
            <div className="bg-orange-100 rounded-lg p-3">
              <div className="text-xl font-bold text-orange-600">{topAttendant}</div>
              <div className="text-xs text-muted-foreground">Top Performer</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by registration, model, or attendant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterPayment === "All" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPayment("All")}
            >
              <Filter className="h-4 w-4 mr-2" />
              All
            </Button>
            <Button
              variant={filterPayment === "Cash" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPayment("Cash")}
            >
              Cash
            </Button>
            <Button
              variant={filterPayment === "Mpesa" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPayment("Mpesa")}
            >
              M-Pesa
            </Button>
          </div>
        </div>

        {/* Payment Method Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="font-medium text-green-800">M-Pesa</span>
                  <div className="text-right">
                    <span className="font-bold text-green-900">{mpesaCount} transactions</span>
                    <br />
                    <span className="text-sm text-green-600">
                      {filteredRecords.length > 0 ? ((mpesaCount / filteredRecords.length) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span className="font-medium text-blue-800">Cash</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-900">{cashCount} transactions</span>
                    <br />
                    <span className="text-sm text-blue-600">
                      {filteredRecords.length > 0 ? ((cashCount / filteredRecords.length) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Revenue Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total All Time:</span>
                  <span className="font-bold">KSh {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filtered View:</span>
                  <span className="font-bold">KSh {weeklyRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average per Service:</span>
                  <span className="font-bold">KSh {averageTransaction.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Today's Revenue:</span>
                  <span className="font-bold">
                    KSh {todayRecords.reduce((sum, r) => sum + r.amountPaid, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Records */}
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No records found</h3>
              <p>No car wash records match your search criteria.</p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <Card key={record.id} className="border-l-4 border-l-primary hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-lg">{record.registrationNumber}</span>
                        <Badge variant="secondary">{record.carModel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{record.services}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>Attendant: {record.attendant}</span>
                      </div>
                    </div>
                    
                    <div className="text-center md:text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-success" />
                        <span className="font-bold text-success">KSh {record.amountPaid.toLocaleString()}</span>
                      </div>
                      <Badge 
                        variant={record.paymentMethod === 'Mpesa' ? 'default' : 'secondary'}
                        className={record.paymentMethod === 'Mpesa' ? 'bg-green-600' : ''}
                      >
                        {record.paymentMethod}
                      </Badge>
                    </div>
                    
                    <div className="text-center md:text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>{record.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{record.time}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}