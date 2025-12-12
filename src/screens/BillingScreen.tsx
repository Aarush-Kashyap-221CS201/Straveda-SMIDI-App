import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from "../api/client";
import Header from "../components/Header";

const { width } = Dimensions.get('window');

export default function BillingScreen({ route, navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Employee data
  const employeeFromParams = route.params;
  const [employeeId, setEmployeeId] = useState(employeeFromParams?.employeeId || "");
  const [employeeName, setEmployeeName] = useState(employeeFromParams?.employeeName || "");
  const [dealerName, setDealerName] = useState(employeeFromParams?.dealerName || "");

  // Multi-customer state
  const [customers, setCustomers] = useState(() => [
    { 
      id: 1, 
      customerName: dealerName, 
      items: [],
      subtotal: 0 
    }
  ]);
  
  const [currentCustomerIndex, setCurrentCustomerIndex] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [qty, setQty] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Get today's date
  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getCustomerItemsTotal = (customer) =>{
    const totalCommission =
      customer.items?.reduce(
        (sum, item) => sum + (item.commissionAmount || 0),
        0
      ) || 0;
    return customer.subtotal - totalCommission;
  }

  const getCustomerCommissionTotal = (customer) =>{
    const totalCommission =
      customer.items?.reduce(
        (sum, item) => sum + (item.commissionAmount || 0),
        0
      ) || 0;
    return totalCommission;
  }

  // Safe access to current customer
  const currentCustomer = customers?.[currentCustomerIndex] || { 
    id: 1, 
    customerName: "", 
    items: [], 
    subtotal: 0 
  };

  useEffect(() => { 
    fetchProducts();
    if (!employeeId && !employeeFromParams) {
      setTimeout(() => {
        Alert.alert(
          "Select Employee",
          "Please select an employee from the Employees screen to create invoices.",
          [
            { 
              text: "Go to Employees", 
              onPress: () => navigation.navigate("Employees") 
            },
            { 
              text: "Continue Anyway", 
              style: "cancel" 
            }
          ]
        );
      }, 500);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  async function fetchProducts() {
    setLoading(true);
    try {
      const response = await api.get("/api/products");
      setProducts(response.data || []);
    } catch (err) { 
      console.warn("Products fetch error:", err.message);
      Alert.alert("Error", "Failed to load products");
    } finally { 
      setLoading(false); 
    }
  }

  // Customer Management
  const addNewCustomer = () => {
    const currentCustomers = customers || [];
    const maxId = currentCustomers.length > 0 ? Math.max(...currentCustomers.map(c => c.id)) : 0;
    const newCustomerId = maxId + 1;
    
    setCustomers(prev => [
      ...(prev || []), 
      { 
        id: newCustomerId, 
        customerName: "", 
        items: [],
        subtotal: 0 
      }
    ]);
    setCurrentCustomerIndex(currentCustomers.length);
  };

  const removeCustomer = (index) => {
    const currentCustomers = customers || [];
    if (currentCustomers.length <= 1) {
      Alert.alert("Cannot Remove", "At least one customer is required");
      return;
    }
    
    Alert.alert(
      "Remove Customer",
      `Remove ${currentCustomers[index]?.customerName || 'this customer'}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            setCustomers(prev => (prev || []).filter((_, i) => i !== index));
            if (currentCustomerIndex >= index) {
              setCurrentCustomerIndex(Math.max(0, index - 1));
            }
          }
        }
      ]
    );
  };

  const updateCustomerName = (index, name) => {
    setCustomers(prev => (prev || []).map((customer, i) => 
      i === index ? { ...customer, customerName: name } : customer
    ));
  };

  // Item Management
  function resetInputs() {
    setSelectedProductId(null); 
    setQty(""); 
    setCommissionPercent("");
  }

  function addToCurrentCustomer() {
    if (!selectedProductId || !qty) {
      Alert.alert("Missing Information", "Please select a product and enter quantity");
      return;
    }

    const product = products.find(p => p._id === selectedProductId);
    if (!product) {
      Alert.alert("Error", "Selected product not found");
      return;
    }

    if (Number(qty) > product.quantity) {
      Alert.alert("Insufficient Stock", `Only ${product.quantity} bags available in stock`);
      return;
    }

    if (Number(qty) <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity");
      return;
    }

    const appliedCommission = commissionPercent !== "" ? Number(commissionPercent) : (product.commissionPercent ?? 3);
    const itemAmount = Number(qty) * product.rate;
    const commissionAmount = (itemAmount * appliedCommission) / 100;

    const newItem = {
      productId: product._id,
      productName: product.name,
      quantity: Number(qty),
      rate: product.rate,
      itemAmount,
      commissionAmount,
      commissionPercent: appliedCommission,
      lineTotal: itemAmount + commissionAmount,
      stock: product.quantity
    };

    setCustomers(prev => (prev || []).map((customer, i) => 
      i === currentCustomerIndex 
        ? { 
            ...customer, 
            items: [...(customer.items || []), newItem],
            subtotal: (customer.subtotal || 0) + newItem.lineTotal
          } 
        : customer
    ));
    
    resetInputs();
  }

  function removeItemFromCurrentCustomer(itemIndex) {
    const currentItems = currentCustomer.items || [];
    const itemToRemove = currentItems[itemIndex];
    if (!itemToRemove) return;
    
    setCustomers(prev => (prev || []).map((customer, i) => 
      i === currentCustomerIndex 
        ? { 
            ...customer, 
            items: (customer.items || []).filter((_, idx) => idx !== itemIndex),
            subtotal: (customer.subtotal || 0) - (itemToRemove.lineTotal || 0)
          } 
        : customer
    ));
  }

  // Save Bill with Multiple Customers
  async function saveBill() {
    const currentCustomers = customers || [];
    
    // Validate all customers have names and items
    const invalidCustomers = currentCustomers.filter(customer => 
      !customer?.customerName?.trim() || !customer?.items || customer.items.length === 0
    );

    if (invalidCustomers.length > 0) {
      Alert.alert(
        "Incomplete Customers", 
        "Please ensure all customers have a name and at least one item"
      );
      return;
    }

    if (!employeeId) {
      Alert.alert("Missing Employee", "Please select an employee first");
      navigation.navigate("Employees");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employeeId: employeeId,
        customers: currentCustomers.map(customer => ({
          customerName: customer.customerName.trim(),
          items: (customer.items || []).map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            commissionPercent: item.commissionPercent
          }))
        })),
        notes: notes.trim()
      };

      const response = await api.post("/api/bills", payload);
      
      Alert.alert(
        "Success", 
        `Bill saved successfully for ${currentCustomers.length} customer${currentCustomers.length > 1 ? 's' : ''}!`,
        [
          { 
            text: "OK", 
            onPress: () => {
              // Reset form
              setCustomers([{ id: 1, customerName: dealerName, items: [], subtotal: 0 }]);
              setCurrentCustomerIndex(0);
              setNotes("");
              if (!employeeFromParams) {
                setEmployeeId("");
                setEmployeeName("");
              }
            }
          }
        ]
      );
    } catch (err) {
      console.warn("Save bill error:", err.message || err);
      Alert.alert("Error", err.response?.data?.message || "Failed to save bill");
    } finally { 
      setSaving(false); 
    }
  }

  // Safe Calculations
  const getCalculations = () => {
    try {
      const currentCustomers = customers || [];
      return {
        totalAmount: currentCustomers.reduce((sum, customer) => sum + (getCustomerItemsTotal(customer) || 0), 0) || 0,
        totalItems: currentCustomers.reduce((sum, customer) => 
          sum + ((customer?.items || []).reduce((itemSum, item) => itemSum + (item?.quantity || 0), 0) || 0), 0
        ) || 0,
        totalCustomers: currentCustomers.length || 0,
        totalCommission: currentCustomers.reduce((sum, customer) => sum + (getCustomerCommissionTotal(customer) || 0), 0) || 0
      };
    } catch (error) {
      console.error('Calculation error:', error);
      return { totalAmount: 0, totalItems: 0, totalCustomers: 0, totalCommission: 0 };
    }
  };

  const { totalAmount, totalItems, totalCustomers, totalCommission } = getCalculations();

  const selectedProduct = products.find(p => p._id === selectedProductId);

  const handleProductSelect = (product) => {
    setSelectedProductId(product._id);
    setShowProductDropdown(false);
  };

  const handleSelectEmployee = () => {
    navigation.navigate("Employees");
  };

  // Helper function to truncate long names
  const truncateName = (name, maxLength = 15) => {
    if (!name) return `Customer`;
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  };

  // Render functions
  const renderItemRow = (item, index) => {
    if (!item) return null;
    
    return (
      <View key={index} style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.productName}</Text>
          <View style={styles.itemDetailsRow}>
            <View style={styles.itemDetailTag}>
              <Icon name="package-variant" size={12} color="#64748b" />
              <Text style={styles.itemDetails}>
                {item.quantity} bags × ₹{item.rate}
              </Text>
            </View>
            <View style={styles.itemDetailTag}>
              <Icon name="percent" size={12} color="#64748b" />
              <Text style={styles.itemDetails}>
                Commission: ₹{item.commissionAmount} ({item.commissionPercent}%)
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.itemActions}>
          <Text style={styles.itemTotal}>₹{item.itemAmount}</Text>
          <TouchableOpacity 
            style={styles.removeItemButton}
            onPress={() => removeItemFromCurrentCustomer(index)}
          >
            <Icon name="delete-outline" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Safe array for mapping
  const safeCustomers = customers || [];

  return (
    <View style={styles.container}>
      <Header title="Generating Invoice" />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#16a34a"]}
            tintColor="#16a34a"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Date Header */}
          <View style={styles.dateHeader}>
            <View style={styles.dateContainer}>
              <Icon name="calendar-today" size={16} color="#16a34a" />
              <Text style={styles.dateText}>Today: {getTodayDate()}</Text>
            </View>
            <View style={styles.billIdContainer}>
              <Text style={styles.billIdText}>Smidi Fertilizers</Text>
            </View>
          </View>

          {/* Employee Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>

            </View>
            
            {employeeId ? (
              <View style={styles.employeeSelected}>
                <View style={styles.employeeBadge}>
                  <View style={styles.employeeIconContainer}>
                    <Icon name="account-check" size={18} color="#fff" />
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeNameText}>{employeeName}</Text>
                    <Text style={styles.employeeStatus}>Locked For This Transaction</Text>
                  </View>
                  {/*
                  <TouchableOpacity 
                    style={styles.changeEmployeeButton}
                    onPress={handleSelectEmployee}
                  >
                    <Text style={styles.changeEmployeeText}>Change</Text>
                  </TouchableOpacity>
                  */}
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.selectEmployeeButton}
                onPress={handleSelectEmployee}
              >
                <View style={styles.selectEmployeeContent}>
                  <View style={styles.selectEmployeeIcon}>
                    <Icon name="account-plus" size={22} color="#16a34a" />
                  </View>
                  <View style={styles.selectEmployeeText}>
                    <Text style={styles.selectEmployeeTitle}>Select Employee</Text>
                    <Text style={styles.selectEmployeeSubtitle}>
                      Choose an employee to handle this bill
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            {/* Customer Management - REDESIGNED */}
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.titleIconContainer}>
                    <Icon name="account-multiple" size={20} color="#16a34a" />
                  </View>
                  <View style={styles.titleContent}>
                    <Text style={styles.sectionTitle}>Customer Invoice</Text>
                  </View>
                </View>
                {/*
                <TouchableOpacity 
                  style={[styles.addCustomerButton, !employeeId && styles.addCustomerButtonDisabled]}
                  onPress={addNewCustomer}
                  disabled={!employeeId}
                >
                  <Icon name="plus" size={16} color="#fff" />
                  <Text style={styles.addCustomerText}>Add</Text>
                </TouchableOpacity>
                */}
              </View>

              {/* Customer Tabs - FIXED LAYOUT */}
              <View style={styles.customerTabsWrapper}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.customerTabsContent}
                >
                  {safeCustomers.map((customer, index) => (
                    <View key={customer.id} style={styles.customerTabContainer}>
                      <TouchableOpacity
                        style={[
                          styles.customerTab,
                          currentCustomerIndex === index && styles.customerTabActive
                        ]}
                        onPress={() => setCurrentCustomerIndex(index)}
                      >
                        <View style={styles.customerTabIcon}>
                          <Icon 
                            name="account" 
                            size={16} 
                            color={currentCustomerIndex === index ? "#fff" : "#16a34a"} 
                          />
                        </View>
                        <Text 
                          style={[
                            styles.customerTabText,
                            currentCustomerIndex === index && styles.customerTabTextActive
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {customer.customerName ? truncateName(customer.customerName) : `Customer ${index + 1}`}
                        </Text>
                        {(customer.items || []).length > 0 && (
                          <View style={[
                            styles.customerItemCount,
                            currentCustomerIndex === index && styles.customerItemCountActive
                          ]}>
                            <Text style={[
                              styles.customerItemCountText,
                              currentCustomerIndex === index && styles.customerItemCountTextActive
                            ]}>
                              {customer.items.length}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      
                      {/* Remove Button - Only show if more than 1 customer */}
                      {safeCustomers.length > 1 && (
                        <TouchableOpacity 
                          style={styles.removeTabButton}
                          onPress={() => removeCustomer(index)}
                        >
                          <Icon name="close" size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Current Customer Form */}
              {/* Customer Name Input */}
              <View style={styles.inputCard}>
                  <View style={styles.inputHeader}>
                    <Text style={styles.inputLabel}>Customer Name</Text>
                    <Text style={styles.requiredBadge}>*</Text>
                  </View>
                  <View style={styles.inputField}>
                    <Icon name="account-outline" size={18} color="#64748b" style={styles.fieldIcon} />
                    <TextInput 
                      value={currentCustomer.customerName} 
                      onChangeText={(text) => updateCustomerName(currentCustomerIndex, text)} 
                      style={styles.nameInput} 
                      placeholder="Enter Customer Name"
                      placeholderTextColor="#94a3b8"
                    />
                    {currentCustomer.customerName ? (
                      <Icon name="check-circle" size={18} color="#16a34a" />
                    ) : (
                      <Icon name="alert-circle-outline" size={18} color="#f59e0b" />
                    )}
                  </View>
              </View>

            <View style={{ height: 20 }} />

            {/* Add Items to Current Customer */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  {/*
                  <View style={styles.titleIconContainer}>
                    <Icon name="cart-plus" size={20} color="#16a34a" />
                  </View>
                  */}
                  <View style={styles.titleContent}>
                    <Text style={styles.sectionTitle}>Add Items</Text>
                    {/*
                    <Text style={styles.sectionSubtitle}>
                      Adding to {currentCustomer.customerName ? truncateName(currentCustomer.customerName, 20) : `Customer ${currentCustomerIndex + 1}`}
                    </Text>
                    */}
                  </View>
                </View>
                {/*
                {(currentCustomer.items || []).length > 0 && (
                  <View style={styles.customerSubtotalBadge}>
                    <Text style={styles.customerSubtotalText}>
                      ₹{Number(currentCustomer.subtotal || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
                */}
              </View>
              
              {/* Product Selection */}
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>
                    Select Product
                  </Text>
                  <Text style={styles.required}>*</Text>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.dropdownTrigger,
                    !employeeId && styles.dropdownTriggerDisabled
                  ]}
                  onPress={() => setShowProductDropdown(!showProductDropdown)}
                  disabled={!employeeId}
                >
                  <View style={styles.dropdownTriggerContent}>
                    {selectedProduct ? (
                      <View style={styles.selectedProductInfo}>
                        <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                        <View style={styles.selectedProductDetails}>
                          <View style={styles.productDetailItem}>
                            <Icon name="package-variant" size={12} color="#64748b" />
                            <Text style={styles.productDetailText}>
                              Stock: {selectedProduct.quantity} bags
                            </Text>
                          </View>
                          <View style={styles.productDetailItem}>
                            <Icon name="currency-inr" size={12} color="#64748b" />
                            <Text style={styles.productDetailText}>
                              ₹{Number(selectedProduct.rate).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <Text style={[
                        styles.dropdownPlaceholder,
                        !employeeId && styles.disabledText
                      ]}>
                        {employeeId ? "Tap to select product" : "Select employee first"}
                      </Text>
                    )}
                    <View style={[
                      styles.dropdownIcon,
                      showProductDropdown && styles.dropdownIconActive
                    ]}>
                      <Icon 
                        name={showProductDropdown ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={employeeId ? "#64748b" : "#cbd5e1"} 
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                <Modal
                  visible={showProductDropdown}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowProductDropdown(false)}
                >
                  <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowProductDropdown(false)}
                  >
                    <View style={styles.dropdownContainer}>
                      <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>Select Product</Text>
                        <Text style={styles.dropdownSubtitle}>Available products in inventory</Text>
                      </View>
                      
                      {loading ? (
                        <View style={styles.dropdownLoading}>
                          <ActivityIndicator size="small" color="#16a34a" />
                          <Text style={styles.loadingText}>Loading products...</Text>
                        </View>
                      ) : products.length === 0 ? (
                        <View style={styles.noProducts}>
                          <Icon name="package-variant-closed" size={48} color="#cbd5e1" />
                          <Text style={styles.noProductsText}>No products available</Text>
                          <Text style={styles.noProductsSubtext}>Add products in inventory first</Text>
                        </View>
                      ) : (
                        <FlatList
                          data={products}
                          keyExtractor={(item) => item._id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[
                                styles.dropdownItem,
                                selectedProductId === item._id && styles.dropdownItemSelected
                              ]}
                              onPress={() => handleProductSelect(item)}
                            >
                              <View style={styles.dropdownItemContent}>
                                <Text style={styles.dropdownItemName}>{item.name}</Text>
                                <View style={styles.dropdownItemMeta}>
                                  <View style={styles.metaItem}>
                                    <Icon name="package-variant" size={12} color="#64748b" />
                                    <Text style={styles.metaText}>{item.quantity} bags</Text>
                                  </View>
                                  <View style={styles.metaItem}>
                                    <Icon name="currency-inr" size={12} color="#64748b" />
                                    <Text style={styles.metaText}>{Number(item.rate).toLocaleString('en-IN')}</Text>
                                  </View>
                                  {item.commissionPercent && (
                                    <View style={styles.metaItem}>
                                      <Icon name="percent" size={12} color="#64748b" />
                                      <Text style={styles.metaText}>{item.commissionPercent}%</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              {selectedProductId === item._id && (
                                <View style={styles.selectedIndicator}>
                                  <Icon name="check-circle" size={20} color="#16a34a" />
                                </View>
                              )}
                            </TouchableOpacity>
                          )}
                          showsVerticalScrollIndicator={false}
                          style={styles.dropdownList}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>
                      Quantity (bags)
                    </Text>
                    <Text style={styles.required}>*</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    {/*
                    <Icon name="numeric" size={16} color="#64748b" style={styles.inputIcon} />
                    */}
                    <TextInput 
                      keyboardType="numeric" 
                      value={qty} 
                      onChangeText={setQty} 
                      style={styles.input} 
                      placeholder="NO."
                      placeholderTextColor="#94a3b8"
                      editable={!!employeeId}
                    />
                    {/*
                    <Text style={styles.quantityUnit}>bags</Text>
                    */}
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.label}>Commission Rate %</Text>
                  <View style={styles.inputWrapper}>
                    {/*
                    <Icon name="percent" size={16} color="#64748b" style={styles.inputIcon} />
                    */}
                    <TextInput 
                      keyboardType="numeric" 
                      value={commissionPercent} 
                      onChangeText={setCommissionPercent} 
                      style={styles.input} 
                      placeholder={selectedProduct ? `Default: ${selectedProduct.commissionPercent || 3}%` : "Default %"}
                      placeholderTextColor="#94a3b8"
                      editable={!!employeeId}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                onPress={addToCurrentCustomer} 
                style={[
                  styles.addToBillButton,
                  (!selectedProductId || !qty || !employeeId) && styles.addToBillButtonDisabled
                ]}
                disabled={!selectedProductId || !qty || !employeeId}
              >
                <View style={styles.addToBillContent}>
                  <Icon name="plus-circle" size={18} color="#fff" />
                  <Text style={styles.addToBillText}>
                    Add to {currentCustomer.customerName ? truncateName(currentCustomer.customerName, 20) : `Customer ${currentCustomerIndex + 1}`}
                  </Text>
                </View>
              </TouchableOpacity>

            
            <View style={{ height: 60 }} />
            
            
            {/* Current Customer's Items */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.titleIconContainer}>
                    <Icon name="format-list-bulleted" size={20} color="#16a34a" />
                  </View>
                  <View style={styles.titleContent}>
                    <Text style={styles.sectionTitle}>
                      {currentCustomer.customerName ? truncateName(currentCustomer.customerName, 25) : `Customer ${currentCustomerIndex + 1}`}'s Items
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      {(currentCustomer.items || []).length} item{(currentCustomer.items || []).length !== 1 ? 's' : ''} • 
                      Subtotal: ₹{Number(getCustomerItemsTotal(currentCustomer)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
                {(currentCustomer.items || []).length > 0 && (
                  <View style={styles.customerItemsBadge}>
                    <Text style={styles.customerItemsCount}>{(currentCustomer.items || []).length}</Text>
                  </View>
                )}
              </View>

              {(currentCustomer.items || []).length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Icon name="cart-outline" size={56} color="#e2e8f0" />
                  </View>
                  <Text style={styles.emptyText}>No items added yet</Text>
                  <Text style={styles.emptySubtext}>
                    Add products to {currentCustomer.customerName ? truncateName(currentCustomer.customerName, 20) : 'this customer'}
                  </Text>
                </View>
              ) : (
                <View style={styles.itemsList}>
                  {(currentCustomer.items || []).map(renderItemRow)}
                </View>
              )}
          </View>

          {/* Notes Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.titleIconContainer}>
                <Icon name="note-text" size={20} color="#16a34a" />
              </View>
              <View style={styles.titleContent}>
                <Text style={styles.sectionTitle}>Bill Notes</Text>
                <Text style={styles.sectionSubtitle}>Additional information for this bill</Text>
              </View>
            </View>
            
            <TextInput 
              value={notes} 
              onChangeText={setNotes} 
              style={styles.notesInput} 
              placeholder="Add any notes for this bill"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Summary and Save */}
          {safeCustomers.some(customer => (customer?.items || []).length > 0) && (
            <View style={styles.section}>
              <View style={styles.summarySection}>
                <View style={styles.summaryHeader}>
                  <View style={styles.summaryIcon}>
                    <Icon name="file-document" size={22} color="#16a34a" />
                  </View>
                  <Text style={styles.summaryTitle}>Bill Summary</Text>
                </View>
                
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <View style={styles.summaryIconContainer}>
                      <Icon name="package-variant" size={16} color="#16a34a" />
                    </View>
                    <Text style={styles.summaryLabel}>Total Items</Text>
                    <Text style={styles.summaryValue}>{totalItems} bags</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <View style={styles.summaryIconContainer}>
                      <Icon name="currency-inr" size={16} color="#16a34a" />
                    </View>
                    <Text style={styles.summaryLabel}>Grand Total</Text>
                    <Text style={styles.grandTotal}>₹{Number(totalAmount).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <View style={styles.summaryIconContainer}>
                      <Icon name="currency-inr" size={16} color="#16a34a" />
                    </View>
                    <Text style={styles.summaryLabel}>Total Commission</Text>
                    <Text style={styles.grandTotal}>₹{Number(totalCommission).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  onPress={saveBill} 
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View style={styles.saveButtonContent}>
                      <Icon name="content-save-check" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>
                        Save Transaction
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  // Date Header
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 6,
  },
  billIdContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  billIdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  section: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  titleIconContainer: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  titleContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  // Customer Management Styles
  addCustomerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addCustomerButtonDisabled: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
  },
  addCustomerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  customerTabsWrapper: {
    marginBottom: 20,
  },
  customerTabsContent: {
    gap: 8,
    paddingVertical: 4,
  },
  customerTabContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  customerTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    minWidth: 160,
    maxWidth: 200,
    gap: 8,
    marginTop: 10,
  },
  customerTabActive: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  customerTabIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    flex: 1,
  },
  customerTabTextActive: {
    color: "#FFFFFF",
  },
  customerItemCount: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: "center",
  },
  customerItemCountActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  customerItemCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  customerItemCountTextActive: {
    color: "#FFFFFF",
  },
  removeTabButton: {
    padding: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customerForm: {
    backgroundColor: '#f8fafc',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentCustomerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
  },
  customerSubtotal: {
    alignItems: 'flex-end',
  },
  customerSubtotalLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  customerSubtotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
  },
  inputCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  requiredBadge: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  fieldIcon: {
    marginRight: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  customerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  // Employee Selection Styles
  employeeSelected: {
    padding: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#dcfce7",
  },
  employeeBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  employeeIconContainer: {
    backgroundColor: "#16a34a",
    padding: 10,
    borderRadius: 10,
    marginRight: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  employeeStatus: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
  },
  changeEmployeeButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  changeEmployeeText: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "600",
  },
  selectEmployeeButton: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  selectEmployeeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectEmployeeIcon: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  selectEmployeeText: {
    flex: 1,
    marginRight: 12,
  },
  selectEmployeeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  selectEmployeeSubtitle: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  // Input Styles
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  required: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  dropdownTrigger: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    justifyContent: "center",
  },
  dropdownTriggerDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  dropdownTriggerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  selectedProductDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  productDetailText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: "#94a3b8",
    flex: 1,
    fontWeight: "500",
  },
  disabledText: {
    color: "#cbd5e1",
  },
  dropdownIcon: {
    padding: 4,
    borderRadius: 6,
  },
  dropdownIconActive: {
    backgroundColor: "#f1f5f9",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxHeight: 500,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#f8fafc",
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  dropdownSubtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  dropdownLoading: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
  },
  noProducts: {
    padding: 48,
    alignItems: "center",
  },
  noProductsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
  },
  noProductsSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  dropdownItemSelected: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },
  dropdownItemContent: {
    flex: 1,
    marginRight: 12,
  },
  dropdownItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },
  dropdownItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  selectedIndicator: {
    padding: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  quantityUnit: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
    marginLeft: 8,
    minWidth: 40,
  },
  halfInput: {
    flex: 1,
  },
  addToBillButton: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addToBillButtonDisabled: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
  },
  addToBillContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addToBillText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  itemsList: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
  notesInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1e293b",
    textAlignVertical: "top",
    minHeight: 100,
    marginTop: 8,
  },
  summarySection: {
    marginTop: 8,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  summaryIcon: {
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 8,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  summaryIconContainer: {
    backgroundColor: "#f0fdf4",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  grandTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16a34a",
  },
  saveButton: {
    backgroundColor: "#15803d",
    borderRadius: 12,
    height: 54,
    justifyContent: "center",
    shadowColor: "#15803d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  // Item Rows
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  itemDetailsRow: {
    gap: 8,
  },
  itemDetailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16a34a",
  },
  removeItemButton: {
    padding: 4,
  },
  customerSubtotalBadge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  customerSubtotalText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "700",
  },
  customerItemsBadge: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  customerItemsCount: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});