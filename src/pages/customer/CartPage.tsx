import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Grid,
  Container,
  Paper,
} from "@mui/material";
import { Add, Remove, Delete, ArrowBack } from "@mui/icons-material";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Reusable session check hook (same as previous pages)
const useSessionCheck = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const sessionData = sessionStorage.getItem('userSession');
    if (!sessionData) {
      navigate('/scanqrcodeagain');
      return;
    }

    const session = JSON.parse(sessionData);
    const currentTime = Date.now();
    if (currentTime - session.timestamp > 900000) { // 15 minutes
      sessionStorage.clear();
      navigate('/scanqrcodeagain');
    }
  }, [navigate]);
};

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  useSessionCheck();
  const [isProcessing, setIsProcessing] = useState(false);

  // Get data from session storage
  const sessionData = JSON.parse(sessionStorage.getItem('userSession') || '{}');
  const [items, setItems] = useState<CartItem[]>(
    JSON.parse(sessionStorage.getItem('selectedItems') || '[]')
  );

  useEffect(() => {
    sessionStorage.setItem('selectedItems', JSON.stringify(items));
    if (items.length === 0) {
      navigate('/customerpage');
    }
  }, [items, navigate]);

  const handleQuantityChange = (itemId: string, increment: boolean) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + (increment ? 1 : -1));
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePayment = async (method: 'Cash' | 'Online') => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/customer/orders`, {
        customer_name: sessionData.name,
        phone: sessionData.phone,
        items,
        total_amount: calculateTotal(),
        payment_method: method,
        restaurant_id: sessionData.restaurantId,
      }, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
  
      // Remove UPI-related code for Online payment
      sessionStorage.removeItem('selectedItems');
      sessionStorage.removeItem('userSession');
      navigate('/thankyou', { 
        state: { 
          payment: method,
          total: calculateTotal()
        } 
      });
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Container sx={{ mt: 4, pb: 8 }}>
      <Box display="flex" alignItems="center" mb={4}>
        <IconButton onClick={() => navigate('/customerpage')} color="primary">
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">Your Cart</Typography>
      </Box>

      <Grid container spacing={3}>
        {items.map((item) => (
          <Grid item xs={12} key={item.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{item.name}</Typography>
                <Typography variant="body1">
                  ₹{item.price} × {item.quantity}
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton 
                  onClick={() => handleQuantityChange(item.id, true)}
                  color="primary"
                >
                  <Add />
                </IconButton>
                <IconButton 
                  onClick={() => handleQuantityChange(item.id, false)}
                  color="secondary"
                  disabled={item.quantity === 1}
                >
                  <Remove />
                </IconButton>
                <IconButton 
                  onClick={() => handleRemoveItem(item.id)}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={3} sx={{ mt: 4, p: 3, position: 'sticky', bottom: 16 }}>
        <Typography variant="h5" gutterBottom>
          Total: ₹{calculateTotal()}
        </Typography>
        
        <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
          <Button
            variant="contained"
            color="success"
            onClick={() => handlePayment('Cash')}
            disabled={isProcessing}
            fullWidth
            size="large"
          >
            Pay with Cash
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handlePayment('Online')}
            disabled={isProcessing}
            fullWidth
            size="large"
          >
            Pay Online
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CartPage;