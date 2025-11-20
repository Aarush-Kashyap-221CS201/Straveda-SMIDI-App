import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveLoginSession = async () => {
  await AsyncStorage.setItem("loggedIn", "true");
};

export const isSessionValid = async () => {
  const loggedIn = await AsyncStorage.getItem("loggedIn");
  return loggedIn === "true";
};

export const logout = async () => {
  await AsyncStorage.removeItem("loggedIn");
};
