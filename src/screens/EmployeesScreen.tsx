import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  Modal,
  TextInput
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from "../api/client";
import Header from "../components/Header";

const { width } = Dimensions.get('window');

export default function EmployeesScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeName, setEmployeeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => { 
    fetchEmployees();
    fetchTransactionCount();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEmployees(), fetchTransactionCount()]);
    setRefreshing(false);
  };

  async function fetchEmployees() {
    setLoading(true);
    try {
      console.log('🔄 Fetching employees from API...');
      const response = await api.get("/api/employees");
      console.log('✅ Employees API response:', response.data);
      console.log('📋 Fetched employees count:', response.data?.data?.length);
      setEmployees(response.data?.data || []);
    } catch (err) { 
      console.error("❌ Employees fetch error:", err.message);
      console.error("❌ Full error:", err.response?.data);
      Alert.alert("Error", "Failed to load employees");
    } finally { 
      setLoading(false); 
    }
  }

  async function fetchTransactionCount() {
    try {
      const response = await api.get("/api/bills?limit=1000");
      const bills = response.data?.bills || response.data || [];
      setTotalTransactions(bills.length);
    } catch (err) {
      console.warn("Transaction count error:", err.message);
      setTotalTransactions(0);
    }
  }

  const handleAddEmployee = () => { 
    setEditingEmployee(null); 
    setEmployeeName("");
    setModalVisible(true); 
  };

  const handleEditEmployee = (employee) => { 
    setEditingEmployee(employee); 
    setEmployeeName(employee.name);
    setModalVisible(true); 
  };

  async function saveEmployee() {
    if (!employeeName.trim()) {
      Alert.alert("Error", "Please enter employee name");
      return;
    }

    setSaving(true);
    try {
      if (editingEmployee) {
        await api.put(`/api/employees/${editingEmployee._id}`, { 
          name: employeeName.trim() 
        });
      } else {
        await api.post("/api/employees", { 
          name: employeeName.trim() 
        });
      }
      setModalVisible(false);
      fetchEmployees();
      Alert.alert("Success", 
        editingEmployee ? "Employee updated successfully" : "Employee added successfully"
      );
    } catch (err) { 
      console.warn("Save employee error:", err.message);
      const errorMsg = err.response?.data?.message || "Failed to save employee";
      Alert.alert("Error", errorMsg);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee) {
    Alert.alert(
      "Delete Employee",
      `Are you sure you want to PERMANENTLY delete "${employee.name}"? This action cannot be undone and the employee will be completely removed from the database.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Permanently", 
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🗑️ Attempting to PERMANENTLY delete employee:', employee._id, employee.name);
              
              const response = await api.delete(`/api/employees/${employee._id}`);
              console.log('✅ Delete API response:', response.data);
              
              if (response.data && response.data.success) {
                // Remove employee from local state immediately
                setEmployees(prev => {
                  const updated = prev.filter(emp => emp._id !== employee._id);
                  console.log('🔄 Local state updated. Remaining employees:', updated.length);
                  return updated;
                });
                
                fetchTransactionCount();
                
                Alert.alert("Success", `"${employee.name}" has been permanently deleted from the database.`);
              } else {
                throw new Error(response.data?.message || 'Delete failed - no success response');
              }
            } catch (err) { 
              console.error("❌ Delete employee error:", err.message);
              console.error("❌ Error response:", err.response?.data);
              const errorMsg = err.response?.data?.message || "Failed to delete employee. Please try again.";
              Alert.alert("Error", errorMsg);
              // Refresh the list if there was an error to show current state
              fetchEmployees();
            }
          }
        }
      ]
    );
  }

  const handleCreateInvoice = (employee) => {
    navigation.navigate("Billing", { 
      employeeId: employee._id,
      employeeName: employee.name 
    });
  };

  const handleOpenDealers = (employee) => {
    navigation.navigate("Dealers", {
      employeeId: employee._id,
      employeeName: employee.name,
    });
  };

  const EmployeeCard = ({ employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeMain}>
        <View style={styles.employeeAvatar}>
          <Icon name="account" size={24} color="#fff" />
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeStatus}>
            <Icon name="circle" size={8} color="#10b981" /> Active
          </Text>
          
        </View>
      </View>
      
      <View style={styles.employeeActions}>
        <TouchableOpacity 
          style={styles.invoiceButton}
          onPress={() => handleOpenDealers(employee)}
        >
          <Text style={styles.invoiceButtonText}>Dealers</Text>
        </TouchableOpacity>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditEmployee(employee)}
          >
            <Icon name="pencil" size={16} color="#3b82f6" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteEmployee(employee)}
          >
            <Icon name="delete" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="account-group" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No Employees Yet</Text>
      <Text style={styles.emptyText}>
        Add your first employee to start managing invoices
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddEmployee}>
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>Add First Employee</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Employee Management" />
      
      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddEmployee}>
          <View style={styles.addButtonContent}>
            <Icon name="plus" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add New Employee</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f0f9ff' }]}>
              <Icon name="account-group" size={20} color="#3b82f6" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{employees.length}</Text>
              <Text style={styles.statLabel}>Total Employees</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
              <Icon name="receipt" size={20} color="#f59e0b" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{totalTransactions}</Text>
              <Text style={styles.statLabel}>Total Transactions</Text>
            </View>
          </View>
        </View>

        <View style={styles.employeesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Employees</Text>
            <Text style={styles.employeeCount}>
              {employees.length} employee{employees.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#22c55e" style={styles.loader} />
          ) : (
            <FlatList 
              data={employees}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => <EmployeeCard employee={item} />}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={["#22c55e"]}
                  tintColor="#22c55e"
                />
              }
              ListEmptyComponent={<EmptyState />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={employees.length === 0 && styles.emptyList}
            />
          )}
        </View>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Employee Name</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="account" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    value={employeeName}
                    onChangeText={setEmployeeName}
                    style={styles.input}
                    placeholder="Enter employee name"
                    placeholderTextColor="#9ca3af"
                    autoFocus={true}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveModalButton, (!employeeName.trim() || saving) && styles.saveButtonDisabled]}
                  onPress={saveEmployee}
                  disabled={!employeeName.trim() || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="check" size={20} color="#fff" />
                      <Text style={styles.saveModalButtonText}>
                        {editingEmployee ? 'Update' : 'Save'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    backgroundColor: "#22c55e",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  employeesSection: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  },
  employeeCount: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  emptyList: {
    flexGrow: 1,
  },
  employeeCard: {
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  employeeMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  employeeStatus: {
    fontSize: 12,
    color: "#6b7280",
    flexDirection: "row",
    alignItems: "center",
  },
  employeeActions: {
    alignItems: "flex-end",
  },
  invoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  invoiceButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  loader: {
    marginVertical: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  closeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1f2937",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14,
  },
  saveModalButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveModalButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  employeeId: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
  },
});