// src/screens/ReportsScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
  Modal
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Header from "../components/Header";
import api from "../api/client";
import moment from "moment";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const navigation = useNavigation();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [employee, setEmployee] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalTransactions: 0,
    averageBill: 0
  });
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  // Employee dropdown states
  const [employees, setEmployees] = useState([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Dealers (customers) dropdown states
  const [dealers, setDealers] = useState([]);
  const [showDealerDropdown, setShowDealerDropdown] = useState(false);
  const [dealerSearch, setDealerSearch] = useState("");

  useEffect(() => {
    fetchTransactions(page);
    fetchEmployees();
    fetchDealers();
  }, [page]);

  const isValidDate = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      const response = await api.get("/api/employees");
      console.log("Employees API response:", response.data);
      
      let employeesData = [];
      
      if (response.data && response.data.success) {
        employeesData = response.data.data || [];
      } else if (Array.isArray(response.data)) {
        employeesData = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        employeesData = response.data.data;
      }
      
      console.log("Processed employees:", employeesData);
      setEmployees(employeesData);
    } catch (err) {
      console.warn("Error fetching employees:", err.message);
    }
  };

  // Fetch dealers (customers) from API
  const fetchDealers = async () => {
    try {
      const response = await api.get("/api/bills/dealers");
      console.log("Dealers API response:", response.data);
      
      let dealersData = [];
      
      if (response.data && response.data.success) {
        dealersData = response.data.dealers || [];
      } else if (Array.isArray(response.data)) {
        dealersData = response.data;
      } else if (response.data && response.data.dealers) {
        dealersData = response.data.dealers;
      }
      
      console.log("Processed dealers:", dealersData);
      setDealers(dealersData);
    } catch (err) {
      console.warn("Error fetching dealers:", err.message);
      extractDealersFromTransactions();
    }
  };

  // Fallback: Extract dealers from transactions
  const extractDealersFromTransactions = () => {
    const dealerSet = new Set();
    transactions.forEach(transaction => {
      if (transaction.customers && Array.isArray(transaction.customers)) {
        transaction.customers.forEach(customer => {
          if (customer.customerName) {
            dealerSet.add(customer.customerName);
          }
        });
      }
    });
    setDealers(Array.from(dealerSet).sort());
  };

  // Fetch transactions - FIXED FOR BACKEND STRUCTURE
  const fetchTransactions = async (p = 1) => {
    setLoading(true);
    try {
      const params = { 
        page: p, 
        limit: 10
      };

      // Add filters if provided - MATCH BACKEND PARAM NAMES
      if (customer.trim() !== "") {
        params.customer = customer.trim();
      }

      if (employee.trim() !== "") {
        params.dealer = employee.trim();
      }

      if (isValidDate(startDate)) params.startDate = startDate;
      if (isValidDate(endDate)) params.endDate = endDate;

      console.log("Fetching transactions with params:", params);

      // Use the filter endpoint that matches backend
      const response = await api.get("/api/bills/filter", { params });
      
      console.log("Transactions API Response:", response.data);

      let transactionsData = [];
      let totalPagesCount = 1;
      let totalTransactions = 0;

      // Handle backend response structure
      if (response.data && response.data.success) {
        transactionsData = response.data.data || [];
        totalPagesCount = response.data.pages || 1;
        totalTransactions = response.data.total || transactionsData.length;
      } else if (Array.isArray(response.data)) {
        transactionsData = response.data;
        totalTransactions = response.data.length;
      } else {
        transactionsData = response.data || [];
        totalTransactions = transactionsData.length;
      }

      console.log("Processed transactions:", transactionsData);

      setTransactions(transactionsData);
      setTotalPages(totalPagesCount);
      
      // Calculate statistics
      calculateStats(transactionsData, totalTransactions);
      
    } catch (err) {
      console.warn("Error fetching transactions:", err.message);
      Alert.alert("Error", "Failed to fetch transactions: " + err.message);
      setTransactions([]);
      setStats({ totalAmount: 0, totalTransactions: 0, averageBill: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (transactionsData, totalCount = null) => {
    const totalAmount = transactionsData.reduce((sum, transaction) => sum + (transaction.totalAmount || transaction.finalAmount || 0), 0);
    const totalTransactions = totalCount || transactionsData.length;
    const averageBill = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    
    setStats({
      totalAmount,
      totalTransactions,
      averageBill
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions(page);
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setCustomer("");
    setEmployee("");
    setEmployeeSearch("");
    setDealerSearch("");
    setPage(1);
    fetchTransactions(1);
  };

  const applyFilters = () => {
    setPage(1);
    fetchTransactions(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Date Picker Functions
  const handleStartDatePress = () => {
    setTempStartDate(startDate ? new Date(startDate) : new Date());
    setShowStartDatePicker(true);
  };

  const handleEndDatePress = () => {
    setTempEndDate(endDate ? new Date(endDate) : new Date());
    setShowEndDatePicker(true);
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
      setStartDate(formattedDate);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
      setEndDate(formattedDate);
    }
  };

  const clearStartDate = () => {
    setStartDate("");
  };

  const clearEndDate = () => {
    setEndDate("");
  };

  // Employee Dropdown Functions
  const handleEmployeeSelect = (selectedEmployee) => {
    const empName = selectedEmployee.name || selectedEmployee;
    setEmployee(empName);
    setShowEmployeeDropdown(false);
    setEmployeeSearch("");
  };

  const clearEmployee = () => {
    setEmployee("");
    setEmployeeSearch("");
  };

  const toggleEmployeeDropdown = () => {
    setShowEmployeeDropdown(!showEmployeeDropdown);
    setEmployeeSearch("");
  };

  // Dealer (Customer) Dropdown Functions
  const handleDealerSelect = (selectedDealer) => {
    setCustomer(selectedDealer);
    setShowDealerDropdown(false);
    setDealerSearch("");
  };

  const clearDealer = () => {
    setCustomer("");
    setDealerSearch("");
  };

  const toggleDealerDropdown = () => {
    setShowDealerDropdown(!showDealerDropdown);
    setDealerSearch("");
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => {
    const empName = emp.name || emp;
    return empName.toLowerCase().includes(employeeSearch.toLowerCase());
  });

  // Filter dealers based on search
  const filteredDealers = dealers.filter(dealerName =>
    dealerName.toLowerCase().includes(dealerSearch.toLowerCase())
  );

  // Transaction Card Component - UPDATED FOR BACKEND STRUCTURE
  const TransactionCard = ({ transaction }) => {
    // Get employee name from backend structure
    const employeeName = transaction.employeeName || "Unknown Employee";
    
    // Get customer names - handle multiple customers from backend
    const getCustomerNames = () => {
      if (transaction.customers && Array.isArray(transaction.customers)) {
        return transaction.customers.map(c => c.customerName).join(", ");
      }
      return "No customers";
    };

    const customerNames = getCustomerNames();
    const totalItems = transaction.totalItems || transaction.customers?.reduce((sum, cust) => 
      sum + (cust.items?.length || 0), 0) || 0;
    const uniqueCustomers = transaction.customers?.length || 0;
    const transactionAmount = transaction.finalAmount || transaction.totalAmount || 0;

    return (
      <View style={styles.transactionCard}>
        {/* Header with Employee Info */}
        <View style={styles.transactionHeader}>
          <View style={styles.employeeSection}>
            <View style={styles.employeeAvatar}>
              <Icon name="account-tie" size={20} color="#fff" />
            </View>
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName}>{employeeName}</Text>
              <Text style={styles.transactionDate}>
                {moment(transaction.createdAt).format("DD MMM YYYY • hh:mm A")}
              </Text>
            </View>
          </View>
          <View style={styles.amountSection}>
            <Text style={styles.amount}>₹{Number(transactionAmount).toLocaleString()}</Text>
            <View style={styles.statusBadge}>
              <Icon name="check-circle" size={9} color="#10b981" />
              <Text style={styles.statusText}>completed</Text>
            </View>
          </View>
        </View>
        
        {/* Customer Information */}
        <View style={styles.customersSection}>
          <View style={styles.customersHeader}>
            <View style={styles.customersLabel}>
              <Icon name="account-group" size={12} color="#6b7280" />
              <Text style={styles.customersLabelText}>
                CUSTOMERS ({uniqueCustomers})
              </Text>
            </View>
          </View>
          <Text style={styles.customerNames} numberOfLines={2}>
            {customerNames}
          </Text>
        </View>

        {/* Items Summary */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <View style={styles.itemsLabel}>
              <Icon name="package-variant" size={12} color="#6b7280" />
              <Text style={styles.itemsLabelText}>ITEMS</Text>
            </View>
            <View style={styles.itemsSummary}>
              <Text style={styles.itemsSummaryText}>
                Total: {totalItems} items
              </Text>
            </View>
          </View>
          
          {/* Show customer items breakdown */}
          <View style={styles.customersBreakdown}>
            {transaction.customers?.slice(0, 3).map((customer, idx) => (
              <View key={idx} style={styles.customerBreakdown}>
                <Text style={styles.customerBreakdownName}>
                  {customer.customerName}
                </Text>
                <Text style={styles.customerBreakdownItems}>
                  {customer.items?.length || 0} items • ₹{Number(customer.subtotal || 0).toLocaleString()}
                </Text>
              </View>
            ))}
            {transaction.customers && transaction.customers.length > 3 && (
              <Text style={styles.moreCustomersText}>
                +{transaction.customers.length - 3} more customers
              </Text>
            )}
          </View>
        </View>
        
        {/* Footer */}
        <View style={styles.transactionFooter}>
          <View style={styles.footerInfo}>
            {transaction.discountPercent > 0 && (
              <View style={styles.discountBadge}>
                <Icon name="tag-outline" size={12} color="#f59e0b" />
                <Text style={styles.discountText}>{transaction.discountPercent}% OFF</Text>
              </View>
            )}
            <View style={styles.commissionBadge}>
              <Icon name="cash" size={12} color="#8b5cf6" />
              <Text style={styles.commissionText}>
                Commission: ₹{Number(transaction.totalCommission || 0).toLocaleString()}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => navigation.navigate('TransactionDetail', { transaction })}
          >
            <Icon name="eye-outline" size={12} color="#22c55e" />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );

  // Employee Dropdown Component
  const EmployeeDropdown = () => (
    <Modal
      visible={showEmployeeDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowEmployeeDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowEmployeeDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select Employee</Text>
            <TouchableOpacity onPress={() => setShowEmployeeDropdown(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchInputContainer}>
            <Icon name="magnify" size={20} color="#6b7280" />
            <TextInput
              placeholder="Search employee..."
              value={employeeSearch}
              onChangeText={setEmployeeSearch}
              style={styles.dropdownSearchInput}
              placeholderTextColor="#9ca3af"
              autoFocus={true}
            />
          </View>

          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item._id || item.id || item}
            renderItem={({ item }) => {
              const empName = item.name || item;
              return (
                <TouchableOpacity
                  style={styles.employeeOption}
                  onPress={() => handleEmployeeSelect(item)}
                >
                  <View style={styles.employeeOptionInfo}>
                    <View style={styles.employeeOptionAvatar}>
                      <Icon name="account" size={20} color="#fff" />
                    </View>
                    <Text style={styles.employeeOptionText}>{empName}</Text>
                  </View>
                  {employee === empName && (
                    <Icon name="check" size={20} color="#22c55e" />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.noEmployeesContainer}>
                <Icon name="account-alert" size={40} color="#d1d5db" />
                <Text style={styles.noEmployeesText}>No employees found</Text>
                <Text style={styles.noEmployeesSubtext}>
                  {employeeSearch ? "Try a different search term" : "No employees available"}
                </Text>
              </View>
            }
            style={styles.dropdownList}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Dealer (Customer) Dropdown Component
  const DealerDropdown = () => (
    <Modal
      visible={showDealerDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDealerDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowDealerDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select Customer</Text>
            <TouchableOpacity onPress={() => setShowDealerDropdown(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchInputContainer}>
            <Icon name="magnify" size={20} color="#6b7280" />
            <TextInput
              placeholder="Search customer..."
              value={dealerSearch}
              onChangeText={setDealerSearch}
              style={styles.dropdownSearchInput}
              placeholderTextColor="#9ca3af"
              autoFocus={true}
            />
          </View>

          <FlatList
            data={filteredDealers}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dealerOption}
                onPress={() => handleDealerSelect(item)}
              >
                <View style={styles.dealerOptionInfo}>
                  <View style={styles.dealerOptionAvatar}>
                    <Icon name="account" size={20} color="#fff" />
                  </View>
                  <Text style={styles.dealerOptionText}>{item}</Text>
                </View>
                {customer === item && (
                  <Icon name="check" size={20} color="#22c55e" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.noDealersContainer}>
                <Icon name="account-alert" size={40} color="#d1d5db" />
                <Text style={styles.noDealersText}>No customers found</Text>
                <Text style={styles.noDealersSubtext}>
                  {dealerSearch ? "Try a different search term" : "No customers available"}
                </Text>
              </View>
            }
            style={styles.dropdownList}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Header title="Transaction History" />
      
      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={tempStartDate}
          mode="date"
          display="default"
          onChange={onStartDateChange}
          maximumDate={new Date()}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={tempEndDate}
          mode="date"
          display="default"
          onChange={onEndDateChange}
          maximumDate={new Date()}
          minimumDate={startDate ? new Date(startDate) : undefined}
        />
      )}

      {/* Employee Dropdown */}
      <EmployeeDropdown />

      {/* Dealer Dropdown */}
      <DealerDropdown />
      
      <ScrollView 
        style={styles.scrollView}
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
        <View style={styles.content}>
          {/* STATISTICS SECTION */}
          <View style={styles.statsSection}>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Revenue"
                value={`₹${Number(stats.totalAmount).toLocaleString()}`}
                subtitle="All transactions"
                icon="cash"
                color="#22c55e"
              />
              <StatCard
                title="Transactions"
                value={stats.totalTransactions.toString()}
                subtitle="Total bills"
                icon="receipt"
                color="#3b82f6"
              />
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                title="Average Bill"
                value={`₹${Number(stats.averageBill).toFixed(0)}`}
                subtitle="Per transaction"
                icon="chart-box"
                color="#f59e0b"
              />
              <StatCard
                title="Current Page"
                value={transactions.length.toString()}
                subtitle="Displayed now"
                icon="file-document"
                color="#8b5cf6"
              />
            </View>
          </View>

          {/* FILTERS SECTION */}
          <View style={styles.filtersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Filters & Search</Text>
              <TouchableOpacity style={styles.filterButton} onPress={resetFilters}>
                <Icon name="filter-variant-remove" size={18} color="#6b7280" />
                <Text style={styles.filterButtonText}>Reset All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterGrid}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>
                  <Icon name="calendar" size={14} color="#6b7280" /> Date Range
                </Text>
                <View style={styles.dateInputs}>
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={handleStartDatePress}
                  >
                    <Text style={[styles.dateInputText, !startDate && styles.placeholderText]}>
                      {startDate || "Start Date"}
                    </Text>
                    <View style={styles.dateInputIcons}>
                      {startDate ? (
                        <TouchableOpacity onPress={clearStartDate} style={styles.clearButton}>
                          <Icon name="close-circle" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      ) : null}
                      <Icon name="calendar" size={18} color="#6b7280" />
                    </View>
                  </TouchableOpacity>
                  
                  <Text style={styles.dateSeparator}>to</Text>
                  
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={handleEndDatePress}
                  >
                    <Text style={[styles.dateInputText, !endDate && styles.placeholderText]}>
                      {endDate || "End Date"}
                    </Text>
                    <View style={styles.dateInputIcons}>
                      {endDate ? (
                        <TouchableOpacity onPress={clearEndDate} style={styles.clearButton}>
                          <Icon name="close-circle" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      ) : null}
                      <Icon name="calendar" size={18} color="#6b7280" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>
                  <Icon name="account-tie" size={14} color="#6b7280" /> Employee
                </Text>
                <TouchableOpacity 
                  style={styles.employeeInput}
                  onPress={toggleEmployeeDropdown}
                >
                  <Text style={[styles.employeeInputText, !employee && styles.placeholderText]}>
                    {employee || "Select Employee"}
                  </Text>
                  <View style={styles.employeeInputIcons}>
                    {employee ? (
                      <TouchableOpacity onPress={clearEmployee} style={styles.clearButton}>
                        <Icon name="close-circle" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    ) : null}
                    <Icon name="chevron-down" size={18} color="#6b7280" />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>
                  <Icon name="account" size={14} color="#6b7280" /> Customer
                </Text>
                <TouchableOpacity 
                  style={styles.dealerInput}
                  onPress={toggleDealerDropdown}
                >
                  <Text style={[styles.dealerInputText, !customer && styles.placeholderText]}>
                    {customer || "Select Customer"}
                  </Text>
                  <View style={styles.dealerInputIcons}>
                    {customer ? (
                      <TouchableOpacity onPress={clearDealer} style={styles.clearButton}>
                        <Icon name="close-circle" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    ) : null}
                    <Icon name="chevron-down" size={18} color="#6b7280" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={applyFilters}
              style={styles.searchButton}
            >
              <Icon name="database-search" size={20} color="#fff" />
              <Text style={styles.searchButtonText}>Search Transactions</Text>
            </TouchableOpacity>
          </View>

          {/* TRANSACTIONS LIST */}
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <Text style={styles.sectionSubtitle}>
                  Showing {transactions.length} of {stats.totalTransactions} transactions
                  {employee && ` • Employee: ${employee}`}
                  {customer && ` • Customer: ${customer}`}
                </Text>
              </View>
              <TouchableOpacity style={styles.exportButton}>
                <Icon name="export" size={18} color="#22c55e" />
                <Text style={styles.exportButtonText}>Export</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={styles.loadingText}>Loading transactions...</Text>
              </View>
            ) : (
              <>
                {!transactions || transactions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <Icon name="chart-bar" size={64} color="#d1d5db" />
                    </View>
                    <Text style={styles.emptyText}>No transactions found</Text>
                    <Text style={styles.emptySubtext}>
                      {customer || employee || startDate || endDate 
                        ? "Try adjusting your search criteria" 
                        : "Start creating bills to see your transaction history"
                      }
                    </Text>
                    <TouchableOpacity 
                      style={styles.emptyActionButton}
                      onPress={() => navigation.navigate('PointOfSale')}
                    >
                      <Icon name="plus" size={18} color="#fff" />
                      <Text style={styles.emptyActionText}>Create First Bill</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={transactions}
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    renderItem={({ item }) => <TransactionCard transaction={item} />}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                  />
                )}

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <View style={styles.simplePagination}>
                    <TouchableOpacity
                      disabled={page === 1}
                      onPress={() => handlePageChange(page - 1)}
                      style={[
                        styles.paginationButton,
                        page === 1 && styles.paginationButtonDisabled
                      ]}
                    >
                      <Icon name="chevron-left" size={20} color={page === 1 ? "#9ca3af" : "#374151"} />
                      <Text style={[
                        styles.paginationButtonText,
                        page === 1 && styles.paginationButtonTextDisabled
                      ]}>Previous</Text>
                    </TouchableOpacity>

                    <View style={styles.paginationInfo}>
                      <Text style={styles.paginationText}>
                        Page <Text style={styles.paginationCurrent}>{page}</Text> of {totalPages}
                      </Text>
                    </View>

                    <TouchableOpacity
                      disabled={page >= totalPages}
                      onPress={() => handlePageChange(page + 1)}
                      style={[
                        styles.paginationButton,
                        page >= totalPages && styles.paginationButtonDisabled
                      ]}
                    >
                      <Text style={[
                        styles.paginationButtonText,
                        page >= totalPages && styles.paginationButtonTextDisabled
                      ]}>Next</Text>
                      <Icon name="chevron-right" size={20} color={page >= totalPages ? "#9ca3af" : "#374151"} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    marginTop: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsSection: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statContent: {
    flexShrink: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: "#9ca3af",
  },
  filtersSection: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterGrid: {
    marginBottom: 20,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  dateInputs: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: "#374151",
  },
  placeholderText: {
    color: "#9ca3af",
  },
  dateInputIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  clearButton: {
    marginRight: 8,
  },
  dateSeparator: {
    fontSize: 14,
    color: "#6b7280",
    marginHorizontal: 8,
  },
  // Employee Input Styles
  employeeInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  employeeInputText: {
    fontSize: 16,
    color: "#374151",
  },
  employeeInputIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Dealer Input Styles
  dealerInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dealerInputText: {
    fontSize: 16,
    color: "#374151",
  },
  dealerInputIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Dropdown Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#374151",
  },
  dropdownList: {
    maxHeight: 300,
  },
  employeeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  employeeOptionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  employeeOptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  employeeOptionText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  dealerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dealerOptionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dealerOptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dealerOptionText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  noEmployeesContainer: {
    alignItems: "center",
    padding: 40,
  },
  noEmployeesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 12,
  },
  noEmployeesSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
  },
  noDealersContainer: {
    alignItems: "center",
    padding: 40,
  },
  noDealersText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 12,
  },
  noDealersSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  searchButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  transactionsSection: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  exportButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#22c55e",
  },
  listContent: {
    paddingTop: 8,
  },
  // UPDATED: Transaction Card Styles for backend structure
  transactionCard: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  employeeSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  employeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  transactionDate: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  amountSection: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 20,
    fontWeight: "900",
    color: "#22c55e",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10b981",
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  // Customers Section
  customersSection: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  customersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  customersLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  customersLabelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  customerNames: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    lineHeight: 18,
  },
  // Items Section
  itemsSection: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  itemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemsLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemsLabelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  itemsSummary: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemsSummaryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },
  customersBreakdown: {
    gap: 8,
  },
  customerBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  customerBreakdownName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  customerBreakdownItems: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  moreCustomersText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
  },
  transactionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  discountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f59e0b",
    marginLeft: 4,
  },
  commissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f5ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ede9fe",
  },
  commissionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8b5cf6",
    marginLeft: 4,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dcfce7",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22c55e",
    marginLeft: 6,
    letterSpacing: -0.2,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  // Simple Pagination Styles
  simplePagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 100,
    justifyContent: "center",
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginHorizontal: 4,
  },
  paginationButtonTextDisabled: {
    color: "#9ca3af",
  },
  paginationInfo: {
    alignItems: "center",
  },
  paginationText: {
    fontSize: 14,
    color: "#6b7280",
  },
  paginationCurrent: {
    fontWeight: "800",
    color: "#22c55e",
  },
});