// src/screens/DashboardScreen.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from "../api/client";
import Header from "../components/Header";
import { AuthContext } from "../context/AuthContext";

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    totalProducts: 0,
    inventoryValue: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalEmployees: 0,
    latestTransactions: [],
    chartData: {
      labels: [],
      datasets: [{ data: [] }]
    }
  });

  const { logoutUser } = useContext(AuthContext);

  useEffect(() => {
    fetchDashboard();
    fetchRecentTransactions();
    fetchChartData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchRecentTransactions(), fetchChartData()]);
    setRefreshing(false);
  };

  async function fetchDashboard() {
    setLoading(true);
    try {
      const response = await api.get("/api/dashboard");
      console.log("Dashboard API response:", response.data);
      
      if (response.data.success) {
        setData(prev => ({
          ...prev,
          ...response.data.data
        }));
      } else {
        console.warn("Dashboard API returned success: false");
      }
    } catch (err) {
      console.warn("Dashboard error:", err.message || err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecentTransactions() {
    try {
      const response = await api.get("/api/bills?page=1&limit=5");
      console.log("Recent Transactions API response:", response.data);
      
      let bills = [];
      
      // Handle different API response structures
      if (response.data && response.data.success && response.data.data) {
        bills = response.data.data.bills || response.data.data || [];
      } else if (response.data && response.data.bills) {
        bills = response.data.bills;
      } else if (response.data && Array.isArray(response.data)) {
        bills = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        bills = response.data.data;
      } else {
        bills = response.data || [];
      }
      
      console.log("Processed recent transactions:", bills);
      
      if (Array.isArray(bills)) {
        setData(prev => ({
          ...prev,
          latestTransactions: bills.slice(0, 5)
        }));
      } else {
        console.warn("Bills data is not an array:", bills);
        setData(prev => ({
          ...prev,
          latestTransactions: []
        }));
      }
    } catch (err) {
      console.warn("Recent transactions error:", err.message);
      setData(prev => ({
        ...prev,
        latestTransactions: []
      }));
    }
  }

  async function fetchChartData() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      
      const response = await api.get(`/api/bills?startDate=${startDate}&limit=100`);
      console.log("Chart Data API response:", response.data);
      
      let bills = [];
      
      if (response.data && response.data.success && response.data.data) {
        bills = response.data.data.bills || response.data.data || [];
      } else if (response.data && response.data.bills) {
        bills = response.data.bills;
      } else if (response.data && Array.isArray(response.data)) {
        bills = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        bills = response.data.data;
      } else {
        bills = response.data || [];
      }
      
      console.log("Processed chart bills:", bills);
      
      if (Array.isArray(bills)) {
        const weeklyData = generateWeeklyRevenueData(bills);
        setData(prev => ({
          ...prev,
          chartData: weeklyData
        }));
      } else {
        console.warn("Bills data for chart is not an array:", bills);
        setData(prev => ({
          ...prev,
          chartData: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
          }
        }));
      }
    } catch (err) {
      console.warn("Chart data error:", err.message);
      setData(prev => ({
        ...prev,
        chartData: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
        }
      }));
    }
  }

  const generateWeeklyRevenueData = (bills) => {
    if (!Array.isArray(bills)) {
      bills = [];
    }
    
    console.log("Generating chart from", bills.length, "bills");
    
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: dayNames[date.getDay()],
        revenue: 0
      });
    }

    console.log("Tracking days:", days);

    bills.forEach(bill => {
      if (bill && bill.createdAt) {
        const billDate = new Date(bill.createdAt).toISOString().split('T')[0];
        const dayData = days.find(day => day.date === billDate);
        if (dayData) {
          const amount = bill.finalAmount || bill.totalAmount || bill.total || bill.amount || bill.grandTotal || 0;
          dayData.revenue += parseFloat(amount) || 0;
          console.log(`Added revenue ${amount} for date ${billDate}`);
        }
      }
    });

    console.log("Final daily revenues:", days.map(d => d.revenue));

    const labels = days.map(day => day.dayName);
    const revenueData = days.map(day => day.revenue);

    return {
      labels: labels,
      datasets: [{
        data: revenueData
      }]
    };
  };

  const getCustomerNames = (bill) => {
    if (bill.customers && Array.isArray(bill.customers)) {
      return bill.customers.map(customer => customer.customerName).join(', ');
    }
    return bill.customerName || "Walk-in Customer";
  };

  const getCustomerCount = (bill) => {
    if (bill.customers && Array.isArray(bill.customers)) {
      return bill.customers.length;
    }
    return 1;
  };

  const StatCard = ({ title, value, icon, color, isCurrency = false, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <View style={styles.statTextContainer}>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Text style={styles.statValue}>
        {isCurrency ? '₹' : ''}{Number(value).toLocaleString()}
      </Text>
    </View>
  );

  const QuickAction = ({ title, icon, onPress, color = "#22c55e" }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const hasChartData = data.chartData?.datasets?.[0]?.data?.some(value => value > 0);

  return (
    <View style={styles.container}>
      <Header
        title="Dashboard"
        rightComponent={
          <TouchableOpacity onPress={logoutUser} style={styles.logoutBtn}>
            <Icon name="logout" size={20} color="#22c55e" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        }
      />

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

        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              title="Employees"
              icon="account-group"
              onPress={() => navigation.navigate("Employees")}
              color="#f59e0b"
            />
            <QuickAction
              title="Manage Products"
              icon="package-variant"
              onPress={() => navigation.navigate("Products")}
              color="#3b82f6"
            />
            <QuickAction
              title="Transactions"
              icon="history"
              onPress={() => navigation.navigate("Reports")}
              color="#8b5cf6"
            />
            <QuickAction
              title="Analytics"
              icon="chart-bar"
              onPress={() => navigation.navigate("Analytics")}
              color="#22c55e"
            />
          </View>
        </View>

        {/* === STATS GRID === */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Products" 
            value={data.totalProducts} 
            icon="package-variant"
            color="#3b82f6"
            subtitle="In inventory"
          />
          <StatCard 
            title="Inventory Value" 
            value={data.inventoryValue} 
            icon="warehouse"
            color="#8b5cf6"
            isCurrency={true}
            subtitle="Current stock"
          />
          <StatCard 
            title="Employees" 
            value={data.totalEmployees} 
            icon="account-group"
            color="#f59e0b"
            subtitle="Active staff"
          />
          <StatCard 
            title="Total Revenue" 
            value={data.totalRevenue} 
            icon="cash-multiple"
            color="#10b981"
            isCurrency={true}
            subtitle="All time"
          />
        </View>

        {/* === REVENUE CHART === */}
        <View style={styles.chartContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Revenue</Text>
            <Text style={styles.chartSubtitle}>Last 7 days</Text>
          </View>
          
          {hasChartData ? (
            <LineChart
              data={data.chartData}
              width={width - 48}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#22c55e'
                },
                propsForLabels: {
                  fontSize: 10
                }
              }}
              bezier
              style={styles.chart}
              fromZero={true}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Icon name="chart-line" size={48} color="#d1d5db" />
              <Text style={styles.chartPlaceholderText}>No revenue data available</Text>
              <Text style={styles.chartPlaceholderSubtext}>
                Create bills to see revenue trends
              </Text>
            </View>
          )}
        </View>

        {/* === RECENT TRANSACTIONS === */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate("Reports")}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Icon name="chevron-right" size={16} color="#22c55e" />
            </TouchableOpacity>
          </View>

          {data.latestTransactions && data.latestTransactions.length > 0 ? (
            data.latestTransactions.map((transaction, index) => (
              console.log(transaction),
              <TouchableOpacity 
                key={transaction._id || `transaction-${index}`} 
                style={styles.transactionCard}
                onPress={() => navigation.navigate("Reports")}
              >
                <View style={styles.transactionIconContainer}>
                  <View style={[styles.transactionIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Icon name="receipt" size={20} color="#22c55e" />
                  </View>
                </View>
                
                <View style={styles.transactionContent}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.employeeName} numberOfLines={1}>
                      {transaction.employeeName || "Employee"}
                    </Text>
                    <Text style={styles.transactionAmount}>
                      ₹{Number(transaction.totalAmount - transaction.totalCommission).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  
                  <Text style={styles.customerNames} numberOfLines={1}>
                    {getCustomerNames(transaction)}
                  </Text>
                  
                  <View style={styles.transactionFooter}>
                    <View style={styles.customerCountBadge}>
                      <Icon name="account-multiple" size={12} color="#6b7280" />
                      <Text style={styles.customerCountText}>
                        {getCustomerCount(transaction)} customer{getCustomerCount(transaction) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={styles.transactionDate}>
                      {transaction.createdAt ? 
                        new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : 
                        "Today"
                      }
                    </Text>
                  </View>
                </View>
                
                <View style={styles.chevronContainer}>
                  <Icon name="chevron-right" size={20} color="#d1d5db" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="receipt-text-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No recent transactions</Text>
              <Text style={styles.emptySubtext}>
                Create your first bill to see transactions here
              </Text>
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
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: "#22c55e",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  statTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  statSubtitle: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  chartContainer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartPlaceholder: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  chartPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
  },
  chartPlaceholderSubtext: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  section: {
    backgroundColor: "#ffffff",
    padding: 20,
    marginTop: -5,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: -4,
    marginLeft: -8,
    marginBottom: -14,
  },
  quickAction: {
    width: (width - 72) / 2,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
  },
  viewAllText: {
    color: "#22c55e",
    fontWeight: "600",
    fontSize: 14,
    marginRight: 4,
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionIconContainer: {
    marginRight: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#dcfce7",
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  employeeName: {
    fontWeight: "700",
    fontSize: 15,
    color: "#1f2937",
    flex: 1,
    marginRight: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#22c55e",
  },
  customerNames: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 6,
    fontWeight: "500",
  },
  transactionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  customerCountText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    marginLeft: 4,
  },
  transactionDate: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
  },
  chevronContainer: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  loader: {
    marginTop: 20,
    marginBottom: 20,
  },
});