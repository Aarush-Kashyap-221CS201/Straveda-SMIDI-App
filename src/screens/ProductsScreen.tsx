// src/screens/ProductsScreen.js
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
  Alert
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from "../api/client";
import Header from "../components/Header";
import ProductRow from "../components/ProductRow";
import AddProductModal from "../components/AddProductModal";

const { width } = Dimensions.get('window');

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { 
    fetchProducts(); 
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

  const onAdd = () => { 
    setEditing(null); 
    setModalVisible(true); 
  };

  async function saveProduct(payload) {
    try {
      if (editing) {
        await api.put(`/api/products/${editing._id}`, payload);
      } else {
        await api.post("/api/products", payload);
      }
      setModalVisible(false);
      fetchProducts();
    } catch (err) { 
      console.warn("Save product error:", err.message);
      Alert.alert("Error", "Failed to save product");
    }
  }

  async function deleteProduct(product) {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete ${product.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/products/${product._id}`);
              fetchProducts();
            } catch (err) { 
              console.warn("Delete product error:", err.message);
              Alert.alert("Error", "Failed to delete product");
            }
          }
        }
      ]
    );
  }

  const ProductStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#f0f9ff' }]}>
          <Icon name="package-variant" size={20} color="#3b82f6" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#f0fdf4' }]}>
          <Icon name="warehouse" size={20} color="#10b981" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statValue}>
            ₹{products.reduce((sum, product) => sum + (product.quantity * product.rate || 0), 0).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.statLabel}>Inventory Value</Text>
        </View>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="package-variant-closed" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No Products Yet</Text>
      <Text style={styles.emptyText}>
        Add your first product to start managing inventory
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>Add First Product</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Product Management" />
      
      <View style={styles.content}>
        {/* Add Product Button */}
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <View style={styles.addButtonContent}>
            <Icon name="plus" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add New Product</Text>
          </View>
        </TouchableOpacity>

        {/* Product Stats */}
        <ProductStats />

        {/* Products List */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products</Text>
            <Text style={styles.productCount}>
              {products.length} product{products.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#22c55e" style={styles.loader} />
          ) : (
            <FlatList 
              data={products}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <ProductRow 
                  item={item} 
                  onEdit={(it) => { setEditing(it); setModalVisible(true); }} 
                  onDelete={deleteProduct} 
                />
              )}
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
              contentContainerStyle={products.length === 0 && styles.emptyList}
            />
          )}
        </View>

        <AddProductModal 
          visible={modalVisible} 
          initial={editing} 
          onClose={() => setModalVisible(false)} 
          onSave={saveProduct} 
        />
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  productsSection: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
  productCount: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  emptyList: {
    flexGrow: 1,
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
});