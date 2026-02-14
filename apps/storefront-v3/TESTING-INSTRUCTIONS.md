# 🧪 Cart API Testing Instructions

## ✅ System Status

Both services are running:
- ✅ **Backend:** http://localhost:9000 (Status: 200 OK)
- ✅ **Storefront:** http://localhost:3001 (Status: 200 OK)

## 🎯 Quick Test Steps

### 1. Open the Storefront
Visit: **http://localhost:3001**

### 2. Find a Product
Navigate to any product page or use the search feature to find products.

### 3. Add to Cart Test
1. Select product options (size, color, etc.)
2. Click "Add to Cart" button
3. ✅ **Expected Result:**
   - Success toast appears
   - Cart icon/counter updates
   - Item is added to cart

### 4. View Cart Test
1. Click the cart icon or open cart drawer
2. ✅ **Expected Result:**
   - Cart opens showing added items
   - Product details display correctly
   - Prices and totals are accurate

### 5. Update Quantity Test
1. In the cart, click the "+" button next to an item
2. Click the "-" button to decrease quantity
3. ✅ **Expected Result:**
   - Quantity changes immediately
   - Price totals recalculate
   - No page reload required

### 6. Remove Item Test
1. In the cart, click the trash icon for any item
2. ✅ **Expected Result:**
   - Item is removed from cart
   - Cart totals update
   - Remaining items remain intact

### 7. Persistence Test
1. Add items to cart
2. Refresh the page (F5 or Cmd+R)
3. Reopen the cart
4. ✅ **Expected Result:**
   - Cart items persist across refresh
   - No data loss

## 🔍 Advanced Testing

### Check Browser Console
Open DevTools (F12) and monitor for:
- Cart operation logs
- API requests to Medusa
- Any error messages

### Check localStorage
In DevTools Console, run:
```javascript
// View cart ID
localStorage.getItem("_medusa_cart_id")

// View all localStorage
console.log(localStorage)
```

### Monitor Network Requests
In DevTools Network tab, look for:
- `POST /store/carts` - Cart creation
- `GET /store/carts/:id` - Cart retrieval
- `POST /store/carts/:id/line-items` - Adding items
- `POST /store/carts/:id/line-items/:id` - Updating items
- `DELETE /store/carts/:id/line-items/:id` - Removing items

## 🐛 Troubleshooting

### Cart not saving?
- Check localStorage: `localStorage.getItem("_medusa_cart_id")`
- Check browser console for errors
- Verify backend is running: http://localhost:9000

### Can't add items?
- Check browser console for API errors
- Verify product has variants
- Check that variant is in stock

### Cart not updating?
- Refresh the page
- Clear localStorage and try again
- Check browser console for errors

## 📊 Success Criteria

✅ **All tests passing when:**
1. Items can be added to cart
2. Cart items display correctly
3. Quantities can be updated
4. Items can be removed
5. Cart persists across page refreshes
6. No console errors during operations
7. API calls complete successfully

## 🎉 Ready to Test!

The cart implementation is complete and ready for testing. All cart operations now use the Medusa JS SDK directly on the client side, with cart IDs stored in localStorage for persistence.

**Start testing:** http://localhost:3001
