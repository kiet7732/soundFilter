//  Kiểm tra kết nối với backend server
import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../services/api";

export function useServerHealth() {
  const [isServerConnected, setIsServerConnected] = useState(false);

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/health`, { timeout: 2000 });
        setIsServerConnected(true);
      } catch (error) {
        setIsServerConnected(false);
      }
    };

    checkServerHealth();
    const interval = setInterval(checkServerHealth, 5000); // Ping mỗi 5 giây
    return () => clearInterval(interval);
  }, []);

  return { isServerConnected };
}
