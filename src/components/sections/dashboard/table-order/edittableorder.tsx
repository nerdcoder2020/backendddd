import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  Grid,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Add, Remove, Delete } from '@mui/icons-material';
import './MenuItem.css';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
}

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  table_number: string | null;
  section_id: number | null;
  items: OrderItem[] | string;
  total_amount: number;
  payment_method?: string;
  status: 'Pending' | 'Completed';
}

const TableEditOrder: React.FC = () => {
  const { state } = useLocation();
  const { order } = state as { order: Order };
  const navigate = useNavigate();

  const [groupedItems, setGroupedItems] = useState<Record<string, MenuItem[]>>({});
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState<number>(order.total_amount || 0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    setEditedItems(Array.isArray(parsedItems) ? parsedItems : []);

    const fetchMenu = async () => {
      try {
        const response = await axios.get<MenuItem[]>(`${import.meta.env.VITE_API_URL}/api/menu`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${localStorage.getItem('userLoggedIn')}`,
          },
        });
        const items = response.data;

        const grouped = items.reduce((acc: Record<string, MenuItem[]>, item: MenuItem) => {
          acc[item.category] = acc[item.category] || [];
          acc[item.category].push(item);
          return acc;
        }, {});
        setGroupedItems(grouped);

        setOpenCategories(
          Object.keys(grouped).reduce(
            (acc, category) => {
              acc[category] = false;
              return acc;
            },
            {} as Record<string, boolean>,
          ),
        );
      } catch (error) {
        console.error('Error fetching menu items:', error);
      }
    };

    fetchMenu();

    if (order.status !== 'Pending') {
      alert('Only Pending orders can be edited.');
      navigate('/tableorder');
    }
  }, [order, navigate]);

  useEffect(() => {
    const calculateTotal = () => {
      const totalAmount = editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      setTotal(totalAmount);
    };
    calculateTotal();
  }, [editedItems]);

  const handleAddItem = (item: MenuItem) => {
    const existingItem = editedItems.find((editedItem) => editedItem.id === item.id);
    if (existingItem) {
      setEditedItems(
        editedItems.map((editedItem) =>
          editedItem.id === item.id
            ? { ...editedItem, quantity: editedItem.quantity + 1 }
            : editedItem,
        ),
      );
    } else {
      setEditedItems([...editedItems, { ...item, quantity: 1 }]);
    }
  };

  const handleIncreaseQuantity = (item: OrderItem) => {
    setEditedItems(
      editedItems.map((editedItem) =>
        editedItem.id === item.id
          ? { ...editedItem, quantity: editedItem.quantity + 1 }
          : editedItem,
      ),
    );
  };

  const handleDecreaseQuantity = (item: OrderItem) => {
    if (item.quantity > 1) {
      setEditedItems(
        editedItems.map((editedItem) =>
          editedItem.id === item.id
            ? { ...editedItem, quantity: editedItem.quantity - 1 }
            : editedItem,
        ),
      );
    } else {
      setEditedItems(editedItems.filter((editedItem) => editedItem.id !== item.id));
    }
  };

  const handleRemoveItem = (item: OrderItem) => {
    setEditedItems(editedItems.filter((editedItem) => editedItem.id !== item.id));
  };

  const handleSaveOrder = async () => {
    if (editedItems.length === 0) {
      alert('Order must have at least one item.');
      return;
    }

    const updatedOrder = {
      items: editedItems,
      total_amount: total,
      status: 'Pending', // Fixed typo from DETstatus
    };

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/tableorder/update/${order.id}`,
        updatedOrder,
        {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${localStorage.getItem('userLoggedIn')}`,
          },
        },
      );
      if (response.status === 200) {
        alert(`Order for Table ${order.table_number} updated successfully!`);
        navigate('/tableorder');
      }
    } catch (error) {
      console.error('Error saving updated table order:', error);
      alert('Failed to update order.');
    }
  };

  const handleBarClick = () => {
    if (selectRef.current) {
      selectRef.current.focus();
      selectRef.current.click();
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);

    if (term.trim() === '') {
      setSelectedCategory('All');
      setOpenCategories((prev) =>
        Object.keys(prev).reduce((acc, cat) => ({ ...acc, [cat]: false }), {}),
      );
      return;
    }

    setSelectedCategory('All');

    const lowerTerm = term.toLowerCase();
    const matchingCategories = Object.entries(groupedItems)
      .filter(([, items]) => items.some((item) => item.name.toLowerCase().includes(lowerTerm)))
      .map(([category]) => category);

    setOpenCategories((prev) =>
      Object.keys(prev).reduce(
        (acc, category) => {
          acc[category] = matchingCategories.includes(category);
          return acc;
        },
        {} as Record<string, boolean>,
      ),
    );
  };

  return (
    <div className="menu__container">
      <Box
        sx={{
          padding: '1rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <Typography variant="h4">Edit Order for Table {order.table_number}</Typography>
      </Box>

      <Box sx={{ display: { xs: 'block', md: 'flex' }, gap: '2rem', padding: '0 1rem' }}>
        <Box sx={{ flex: 1, mb: { xs: '2rem', md: 0 } }}>
          <Box
            sx={{
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: '1rem',
            }}
          >
            <TextField
              label="Search for items"
              variant="outlined"
              fullWidth
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <Box sx={{ position: 'relative', width: { xs: '100%', sm: '200px' } }}>
              <Box
                onClick={handleBarClick}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  borderBottom: '2px solid black',
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {selectedCategory}
                </Typography>
                <ExpandMoreIcon />
              </Box>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as string)}
                inputRef={selectRef}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                }}
              >
                <MenuItem value="All">All</MenuItem>
                {Object.keys(groupedItems)
                  .sort()
                  .map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
              </Select>
            </Box>
          </Box>

          {Object.entries(groupedItems)
            .sort(([a], [b]) => a.localeCompare(b))
            .filter(([category]) => selectedCategory === 'All' || category === selectedCategory)
            .map(([category, items]) => {
              const filteredItems = searchTerm
                ? items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                : items;
              if (filteredItems.length === 0) return null;
              return (
                <Box key={category} sx={{ marginBottom: '2rem' }}>
                  <Box
                    onClick={() =>
                      setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }))
                    }
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '2px solid black',
                      paddingBottom: '1rem',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#f5f5f5' },
                    }}
                  >
                    <Typography variant="h5" sx={{ color: 'black', fontWeight: 'bold' }}>
                      {category}
                    </Typography>
                    {openCategories[category] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                  {openCategories[category] && (
                    <Grid container spacing={2} sx={{ marginTop: '1rem' }}>
                      {filteredItems.map((item) => (
                        <Grid item xs={12} key={item.id}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              padding: '1rem',
                              minHeight: '70px',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                              <img
                                src={item.image}
                                alt={item.name}
                                style={{
                                  width: 50,
                                  height: 50,
                                  marginRight: '10px',
                                  borderRadius: '4px',
                                }}
                              />
                              <Box>
                                <Typography variant="body1">{item.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  ₹{item.price}
                                </Typography>
                              </Box>
                            </Box>
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => handleAddItem(item)}
                              sx={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
                            >
                              Add
                            </Button>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              );
            })}
        </Box>

        <Box
          sx={{
            flex: { xs: 'none', md: 1 },
            position: { xs: 'static', md: 'sticky' },
            top: { md: '2rem' },
            alignSelf: { md: 'flex-start' },
            maxHeight: { md: 'calc(100vh - 4rem)' },
            overflowY: { md: 'auto' },
            padding: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            width: { xs: '100%', md: 'auto' },
            mt: { xs: '2rem', md: 0 },
          }}
        >
          <Typography variant="h6" sx={{ marginBottom: '1rem' }}>
            Order Items
          </Typography>
          {editedItems.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No items in the order yet
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {editedItems.map((item) => (
                <Grid item xs={12} key={item.id}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      padding: '1rem',
                      minHeight: '70px',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1">{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ₹{item.price} x {item.quantity}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <IconButton
                        onClick={() => handleIncreaseQuantity(item)}
                        size="small"
                        sx={{ padding: '4px' }}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDecreaseQuantity(item)}
                        size="small"
                        sx={{ padding: '4px' }}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleRemoveItem(item)}
                        size="small"
                        color="error"
                        sx={{ padding: '4px' }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
          <Typography variant="h6" sx={{ marginTop: '2rem' }}>
            Total: ₹{total}
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSaveOrder}
            disabled={editedItems.length === 0}
            sx={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }}
          >
            Save Order
          </Button>
        </Box>
      </Box>
    </div>
  );
};

export default TableEditOrder;
