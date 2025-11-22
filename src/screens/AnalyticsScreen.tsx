import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from "react-native";
import { PieChart, BarChart } from "react-native-chart-kit";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from "../components/Header";
import api from "../api/client";

const { width } = Dimensions.get('window');

const GAP_SIZE = 12;

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    productSales: [],
    monthlyRevenue: [],
    customerStats: [],
    employeeStats: []
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  async function fetchAnalyticsData() {
    setLoading(true);
    try {
      const billsResponse = await api.get("/api/bills?limit=1000");
      const bills = billsResponse.data?.bills || billsResponse.data || [];
      
      const productsResponse = await api.get("/api/products");
      const products = productsResponse.data || [];

      const employeesResponse = await api.get("/api/employees");
      const employees = employeesResponse.data || [];
      
      const analytics = generateAnalyticsData(bills, products, employees);
      setAnalyticsData(analytics);
    } catch (err) {
      console.warn("Analytics error:", err.message || err);
    } finally {
      setLoading(false);
    }
  }

  const generateAnalyticsData = (bills, products, employees) => {
    // 1. PRODUCT SALES ANALYSIS - Group products beyond top 5 as "Other"
    const productSalesMap = {};
    
    bills.forEach(bill => {
      bill.customers?.forEach(customer => {
        customer.items?.forEach(item => {
          const productId = item.productId;
          const product = products.find(p => p._id === productId);
          const productName = product?.name || `Product ${productId}`;
          const quantity = item.quantity || 0;
          
          if (productSalesMap[productName]) {
            productSalesMap[productName] += quantity;
          } else {
            productSalesMap[productName] = quantity;
          }
        });
      });

      if (!bill.customers && bill.items) {
        bill.items.forEach(item => {
          const productId = item.productId;
          const product = products.find(p => p._id === productId);
          const productName = product?.name || `Product ${productId}`;
          const quantity = item.quantity || 0;
          
          if (productSalesMap[productName]) {
            productSalesMap[productName] += quantity;
          } else {
            productSalesMap[productName] = quantity;
          }
        });
      }
    });

    // Sort and get top 5 products, group rest as "Other"
    const allProductSales = Object.entries(productSalesMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    const topProducts = allProductSales.slice(0, 5);
    const otherProductsTotal = allProductSales.slice(5).reduce((sum, product) => sum + product.quantity, 0);

    // Truncate long product names
    const productSales = [
      ...topProducts.map((product, index) => ({
        name: truncateProductName(product.name, 15), // Truncate to 15 characters
        quantity: product.quantity,
        color: getColorByIndex(index),
        legendFontColor: '#7F7F7F',
        legendFontSize: 10 // Reduced font size for better fit
      }))
    ];

    // Add "Other" category if there are more than 5 products
    if (otherProductsTotal > 0) {
      productSales.push({
        name: 'Other',
        quantity: otherProductsTotal,
        color: '#9CA3AF',
        legendFontColor: '#7F7F7F',
        legendFontSize: 10
      });
    }

    // 2. MONTHLY REVENUE
    const monthlyRevenue = Array(6).fill(0).map((_, index) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (5 - index));
      const monthKey = month.toLocaleString('default', { month: 'short' });
      const year = month.getFullYear().toString().slice(-2);
      
      const monthBills = bills.filter(bill => {
        if (!bill.createdAt) return false;
        const billDate = new Date(bill.createdAt);
        return billDate.getMonth() === month.getMonth() && 
               billDate.getFullYear() === month.getFullYear();
      });
      
      const revenue = monthBills.reduce((sum, bill) => sum + (bill.finalAmount || bill.totalAmount || 0), 0);
      
      return {
        month: `${monthKey} '${year}`,
        revenue: revenue,
        fullMonth: month.toLocaleString('default', { month: 'long', year: 'numeric' })
      };
    });

    // 3. CUSTOMER STATS
    const customerMap = {};
    
    bills.forEach(bill => {
      bill.customers?.forEach(customer => {
        const customerName = customer.customerName || 'Unknown Customer';
        const amount = customer.subtotal || 0;
        
        if (customerMap[customerName]) {
          customerMap[customerName].totalAmount += amount;
          customerMap[customerName].transactionCount += 1;
        } else {
          customerMap[customerName] = {
            totalAmount: amount,
            transactionCount: 1
          };
        }
      });

      if (!bill.customers) {
        const customerName = bill.customerName || 'Unknown Customer';
        const amount = bill.totalAmount || 0;
        
        if (customerMap[customerName]) {
          customerMap[customerName].totalAmount += amount;
          customerMap[customerName].transactionCount += 1;
        } else {
          customerMap[customerName] = {
            totalAmount: amount,
            transactionCount: 1
          };
        }
      }
    });

    const customerStats = Object.entries(customerMap)
      .map(([name, data]) => ({
        name,
        ...data
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // 4. EMPLOYEE STATS
    const employeeMap = {};
    
    bills.forEach(bill => {
      const employeeName = bill.employeeName || 'Unknown Employee';
      const employeeId = bill.employeeId;
      
      let billCommission = 0;
      let billSalesCount = 0;
      let billRevenue = 0;

      bill.customers?.forEach(customer => {
        customer.items?.forEach(item => {
          billCommission += item.commissionAmount || 0;
          billSalesCount += 1;
        });
        billRevenue += customer.subtotal || 0;
      });

      if (!bill.customers && bill.items) {
        bill.items.forEach(item => {
          billCommission += item.commissionAmount || 0;
          billSalesCount += 1;
        });
        billRevenue = bill.totalAmount || 0;
      }

      if (employeeMap[employeeName]) {
        employeeMap[employeeName].totalCommission += billCommission;
        employeeMap[employeeName].salesCount += billSalesCount;
        employeeMap[employeeName].totalRevenue += billRevenue;
        employeeMap[employeeName].billCount += 1;
      } else {
        employeeMap[employeeName] = {
          totalCommission: billCommission,
          salesCount: billSalesCount,
          totalRevenue: billRevenue,
          billCount: 1,
          employeeId: employeeId
        };
      }
    });

    const employeeStats = Object.entries(employeeMap)
      .map(([name, data]) => ({
        name,
        ...data
      }))
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .slice(0, 5);

    return {
      productSales,
      monthlyRevenue,
      customerStats,
      employeeStats
    };
  };

  // Helper function to truncate long product names
  const truncateProductName = (name, maxLength) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const getColorByIndex = (index) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
    ];
    return colors[index % colors.length];
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const totalSixMonthRevenue = analyticsData.monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0);
  const totalProductsSold = analyticsData.productSales.reduce((sum, product) => sum + product.quantity, 0);

  return (
    <View style={styles.container}>
      <Header title="Analytics" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#22c55e"]}
            tintColor="#22c55e"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <StatCard
            title="6 Month Revenue"
            value={`₹${Number(totalSixMonthRevenue).toLocaleString('en-IN')}`}
            subtitle="Last 6 months total"
            icon="cash-multiple"
            color="#10b981"
          />
          <StatCard
            title="Products Sold"
            value={totalProductsSold}
            subtitle="Total units"
            icon="package-variant"
            color="#3b82f6"
          />
          <StatCard
            title="Top Customers"
            value={analyticsData.customerStats.length}
            subtitle="By spending"
            icon="account-group"
            color="#f59e0b"
          />
          <StatCard
            title="Active Employees"
            value={analyticsData.employeeStats.length}
            subtitle="By commission"
            icon="account-tie"
            color="#8b5cf6"
          />
        </View>

        {/* Fixed Pie Chart Section */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Product Sales</Text>
          {analyticsData.productSales.length > 0 ? (
            <View style={styles.pieChartWrapper}>
              <PieChart
                data={analyticsData.productSales}
                width={width - 48}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="quantity"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={true}
              />
              {/* Additional legend for better readability */}
              
            </View>
          ) : (
            <View style={styles.chartPlaceholder}>
              <Icon name="chart-pie" size={48} color="#d1d5db" />
              <Text style={styles.placeholderText}>No product sales data</Text>
            </View>
          )}
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>6 Months Revenue</Text>
            <Text style={styles.chartSubtitle}>
              Total: ₹{Number(totalSixMonthRevenue).toLocaleString('en-IN')}
            </Text>
          </View>
          {analyticsData.monthlyRevenue.some(m => m.revenue > 0) ? (
            <BarChart
              data={{
                labels: analyticsData.monthlyRevenue.map(m => m.month),
                datasets: [{
                  data: analyticsData.monthlyRevenue.map(m => m.revenue)
                }]
              }}
              width={width - 48}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                barPercentage: 0.6,
              }}
              style={styles.chart}
              fromZero={true}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Icon name="chart-bar" size={48} color="#d1d5db" />
              <Text style={styles.placeholderText}>No revenue data for last 6 months</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Customers</Text>
          {analyticsData.customerStats.length > 0 ? (
            analyticsData.customerStats.map((customer, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.itemLeft}>
                  <View style={[styles.itemIcon, { backgroundColor: '#e0f2f7' }]}>
                    <Icon name="account-circle" size={20} color="#007bff" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{customer.name}</Text>
                    <Text style={styles.itemSubtitle}>
                      {customer.transactionCount} transaction{customer.transactionCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemAmount}>
                  ₹{Number(customer.totalAmount).toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="account-search" size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>No customer data available</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Employees</Text>
          {analyticsData.employeeStats.length > 0 ? (
            analyticsData.employeeStats.map((employee, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.itemLeft}>
                  <View style={[styles.itemIcon, { backgroundColor: '#e6f7ed' }]}>
                    <Icon name="account-tie" size={20} color="#18a558" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{employee.name}</Text>
                    <Text style={styles.itemSubtitle}>
                      {employee.billCount} bill{employee.billCount !== 1 ? 's' : ''} • {employee.salesCount} sales
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemAmount}>
                  ₹{Number(employee.totalCommission).toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="account-tie-outline" size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>No employee data available</Text>
            </View>
          )}
        </View>

        {loading && (
          <ActivityIndicator size="large" color="#22c55e" style={styles.loader} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 8,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
  },
  statSubtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pieChartWrapper: {
    alignItems: 'center',
  },
  legendContainer: {
    marginTop: 10,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "600",
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  chartPlaceholder: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
  },
  section: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 8,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#1f2937",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#22c55e",
  },
  emptyState: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
  },
  loader: {
    marginTop: 20,
    marginBottom: 20,
  },
});