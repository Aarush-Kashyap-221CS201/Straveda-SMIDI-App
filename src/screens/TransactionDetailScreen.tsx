// src/screens/TransactionDetailScreen.js
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Share
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import Header from "../components/Header";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from "moment";
import api from "../api/client";

import RNFS from "react-native-fs";

export default function TransactionDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { transaction } = route.params;
  console.log(transaction);

  const handleDownloadPDF = async () => {
    {/*
    try {
      const pdfUrl = `${api.defaults.baseURL}/api/bills/${transaction._id}/pdf`;
      
      const supported = await Linking.canOpenURL(pdfUrl);
      
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert("Error", "Cannot open PDF on this device");
      }
    } catch (error) {
      console.error("PDF Download Error:", error);
      Alert.alert("Error", "Failed to download PDF");
    }
    */}
    const pdfUrl = `${api.defaults.baseURL}/api/bills/${transaction._id}/pdf`
    const openendUrl = "https://docs.google.com/viewer?url=" + encodeURIComponent(pdfUrl)

    console.log(pdfUrl);
    console.log(openendUrl);

    Linking.openURL(openendUrl);

    {/*
    try {
      const pdfUrl = `${api.defaults.baseURL}/api/bills/${transaction._id}/pdf`;

      // 1. Download to temp folder
      const localPath = RNFS.CachesDirectoryPath + "/bill.pdf";
      await RNFS.downloadFile({ fromUrl: pdfUrl, toFile: localPath }).promise;

      // 2. Share sheet with SAVE options
      await Share.open({
        url: "file://" + localPath,
        type: "application/pdf",
        showAppsToView: true,
      });
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to download");
    }
    */}
  };

  const handleShare = async () => {
    try {
      const pdfUrl = `${api.defaults.baseURL}/api/bills/${transaction._id}/pdf`;
      
      await Share.share({
        message: `Transaction Bill - ${transaction.billNumber}`,
        url: pdfUrl,
        title: 'Transaction Bill'
      });
    } catch (error) {
      console.error("Share Error:", error);
    }
  };

  // FIXED: Calculate totals for new structure with multiple customers
  const calculateItemsTotal = () => {
    if (!transaction.customers || !Array.isArray(transaction.customers)) return 0;
    
    return transaction.customers.reduce((total, customer) => {
      const customerItemsTotal = customer.items?.reduce((sum, item) => 
        sum + (item.itemAmount || 0), 0) || 0;
      return total + customerItemsTotal;
    }, 0);
  };

  const calculateCommissionTotal = () => {
    if (!transaction.customers || !Array.isArray(transaction.customers)) return 0;
    
    return transaction.customers.reduce((total, customer) => {
      const customerCommissionTotal = customer.items?.reduce((sum, item) => 
        sum + (item.commissionAmount || 0), 0) || 0;
      return total + customerCommissionTotal;
    }, 0);
  };

  const getDiscountAmount = () => {
    return transaction.discountAmount || 0;
  };

  // Get total items count
  const getTotalItemsCount = () => {
    if (!transaction.customers || !Array.isArray(transaction.customers)) return 0;
    
    return transaction.customers.reduce((total, customer) => 
      total + (customer.items?.length || 0), 0);
  };

  // Get employee name
  const getEmployeeName = () => {
    return transaction.employeeName || 
           transaction.employeeId?.name || 
           "Unknown Employee";
  };

  const getCustomerItemsTotal = (customer) =>{
    const totalCommission =
      customer.items?.reduce(
        (sum, item) => sum + (item.commissionAmount || 0),
        0
      ) || 0;

    return (customer.subtotal || 0) - totalCommission;
  }

  return (
    <View style={styles.container}>
     >
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.transactionHeader}>
            <View style={styles.avatar}>
              <Icon name="receipt" size={32} color="#fff" />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.billNumber}>{transaction.billNumber}</Text>
              <Text style={styles.transactionDate}>
                {moment(transaction.createdAt).format("DD MMM YYYY • hh:mm A")}
              </Text>
              <View style={styles.statusBadge}>
                <Icon name="check-circle" size={14} color="#10b981" />
                <Text style={styles.statusText}>Completed</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.amountSection}>
            <Text style={styles.amount}>₹{Number(transaction.totalAmount - transaction.totalCommission).toLocaleString()}</Text>
            <Text style={styles.amountLabel}>Final Amount</Text>
          </View>
        </View>

        {/* Employee Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Information</Text>
          <View style={styles.employeeCard}>
            <View style={styles.employeeAvatar}>
              <Icon name="account-tie" size={24} color="#fff" />
            </View>
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName}>{getEmployeeName()}</Text>
              <Text style={styles.employeeId}>
                ID: {transaction.employeeId?._id?.slice(-8) || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPDF}>
            <Icon name="download" size={20} color="#fff" />
            <Text style={styles.downloadButtonText}>Download PDF</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Icon name="share-variant" size={20} color="#3b82f6" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Bill Number</Text>
              <Text style={styles.summaryValue}>
                {transaction.billNumber || "N/A"}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Date & Time</Text>
              <Text style={styles.summaryValue}>
                {moment(transaction.createdAt).format("DD/MM/YYYY • hh:mm A")}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Customers</Text>
              <Text style={styles.summaryValue}>
                {transaction.customers?.length || 0} customers
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Items</Text>
              <Text style={styles.summaryValue}>
                {getTotalItemsCount()} items
              </Text>
            </View>
            
            {transaction.notes && (
              <View style={styles.summaryItemFull}>
                <Text style={styles.summaryLabel}>Notes</Text>
                <Text style={styles.summaryValue}>{transaction.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Customers & Items List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Customers & Items</Text>
            <Text style={styles.itemsCount}>
              {transaction.customers?.length || 0} customers
            </Text>
          </View>
          
          <View style={styles.customersList}>
            {transaction.customers?.map((customer, customerIndex) => (
              <View key={customerIndex} style={styles.customerCard}>
                {/* Customer Header */}
                <View style={styles.customerHeader}>
                  <View style={styles.customerAvatar}>
                    <Icon name="account" size={20} color="#fff" />
                  </View>
                  <Text style={styles.customerName}>{customer.customerName}</Text>
                  <Text style={styles.customerSubtotal}>
                    ₹{Number(getCustomerItemsTotal(customer)).toLocaleString()}
                  </Text>
                </View>

                {/* Customer Items */}
                <View style={styles.customerItems}>
                  {customer.items?.map((item, itemIndex) => (
                    <View key={itemIndex} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        <Text style={styles.itemTotal}>
                          ₹{Number(item.itemAmount).toLocaleString()}
                        </Text>
                      </View>
                      
                      <View style={styles.itemDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Quantity:</Text>
                          <Text style={styles.detailValue}>{item.quantity}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Rate:</Text>
                          <Text style={styles.detailValue}>₹{Number(item.rate).toLocaleString()}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Base Amount:</Text>
                          <Text style={styles.detailValue}>₹{Number(item.itemAmount).toLocaleString()}</Text>
                        </View>
                        {item.commissionPercent > 0 && (
                          <>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Commission:</Text>
                              <Text style={styles.detailValue}>{item.commissionPercent}%</Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Commission Amount:</Text>
                              <Text style={styles.detailValue}>
                                ₹{Number(item.commissionAmount).toLocaleString()}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Customer Summary */}
                <View style={styles.customerSummary}>
                  <Text style={styles.customerSummaryText}>
                    {customer.items?.length || 0} items • ₹{Number(getCustomerItemsTotal(customer)).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Items Total</Text>
              <Text style={styles.priceValue}>
                ₹{Number(calculateItemsTotal()).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total Commission</Text>
              <Text style={styles.priceValue}>
                ₹{Number(calculateCommissionTotal()).toLocaleString()}
              </Text>
            </View>
            
            {transaction.discountPercent > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Discount ({transaction.discountPercent}%)
                </Text>
                <Text style={[styles.priceValue, styles.discountValue]}>
                  -₹{Number(getDiscountAmount()).toLocaleString()}
                </Text>
              </View>
            )}
            
            
          </View>
        </View>

        {/* Footer Note */}
        <View style={styles.footer}>
          <Icon name="shield-check" size={20} color="#10b981" />
          <Text style={styles.footerText}>
            This is a computer generated invoice and doesn't require signature.
          </Text>
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
  headerCard: {
    backgroundColor: "#ffffff",
    margin: 16,
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  billNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
    marginLeft: 4,
  },
  amountSection: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#22c55e",
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  // Employee Section
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  employeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f59e0b",
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
    marginBottom: 2,
  },
  employeeId: {
    fontSize: 12,
    color: "#6b7280",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  downloadButton: {
    flex: 1,
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
  downloadButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3b82f6",
    minWidth: 80,
  },
  shareButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
  section: {
    backgroundColor: "#ffffff",
    margin: 16,
    marginTop: 0,
    padding: 24,
    borderRadius: 20,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 16,
  },
  itemsCount: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  summaryItem: {
    width: "50%",
    padding: 8,
  },
  summaryItemFull: {
    width: "100%",
    padding: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "700",
  },
  // Customers & Items Styles
  customersList: {
    gap: 16,
  },
  customerCard: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    flex: 1,
  },
  customerSubtotal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#22c55e",
  },
  customerItems: {
    gap: 12,
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    marginRight: 12,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#22c55e",
  },
  itemDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  customerSummary: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  customerSummaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
  },
  priceBreakdown: {
    gap: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  priceLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  discountValue: {
    color: "#ef4444",
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
    paddingTop: 16,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#22c55e",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginBottom: 16,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
  },
});