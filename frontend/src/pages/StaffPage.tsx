import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Calendar,
  User,
  CreditCard
} from "lucide-react";
import { apiService, StaffCommissionData } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export function StaffPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [commissionData, setCommissionData] = useState<StaffCommissionData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadCommissionData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getStaffCommission(selectedDate);
      if (response.success && response.data) {
        setCommissionData(response.data);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load commission data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading commission data:', error);
      toast({
        title: "Error",
        description: "Failed to load commission data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommissionData();
  }, [selectedDate]);

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Commission</h1>
        <p className="text-sm text-muted-foreground">
          Calculate and track commission for service staff
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {commissionData?.totalStaff || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>

        {/* Total Commission */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(commissionData?.totalCommission || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissionData?.commissionRate || 30}% of total revenue
            </p>
          </CardContent>
        </Card>

        {/* Total Services */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {commissionData?.totalServices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Services completed
            </p>
          </CardContent>
        </Card>

        {/* Commission Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {commissionData?.commissionRate || 30}%
            </div>
            <p className="text-xs text-muted-foreground">
              Per service commission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      {commissionData && commissionData.staffBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Daily Summary</CardTitle>
            <CardDescription className="text-sm">
              Overview of {formatDate(selectedDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold text-primary">
                  {formatCurrency(commissionData.totalRevenue)}
                </div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(commissionData.totalCommission)}
                </div>
                <p className="text-sm text-muted-foreground">Total Commission</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(commissionData.totalRevenue - commissionData.totalCommission)}
                </div>
                <p className="text-sm text-muted-foreground">Net Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Commission Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-4 w-4" />
                Staff Commission Breakdown
              </CardTitle>
              <CardDescription className="text-sm">
                Individual staff performance and commission for {formatDate(selectedDate)}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!commissionData || commissionData.staffBreakdown.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-medium mb-1">No staff commission data available</h3>
              <p className="text-sm">Add some service records to see commission calculations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissionData.staffBreakdown.map((staff, index) => (
                <Card key={staff.attendant} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-base">{staff.attendant}</span>
                          <Badge variant="secondary" className="text-xs">#{index + 1}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>{staff.services} services completed</span>
                        </div>
                      </div>
                      
                      <div className="text-center md:text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="h-4 w-4 text-success" />
                          <span className="font-bold text-success text-sm">
                            {formatCurrency(staff.revenue)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total Revenue
                        </p>
                      </div>
                      
                      <div className="text-center md:text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-green-600 text-sm">
                            {formatCurrency(staff.commission)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Commission Earned
                        </p>
                      </div>
                    </div>
                    
                    {/* Additional Stats */}
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average per Service:</span>
                        <span className="font-medium">{formatCurrency(staff.averageService)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
