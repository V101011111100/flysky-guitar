// Cart store using localStorage - works client-side only
// Future: replace localStorage with API calls

export interface CartItem {
    id: string;
    name: string;
    categoryLabel: string;
    price: number;
    priceFormatted: string;
    image: string;
    quantity: number;
}

const CART_KEY = 'flysky_cart';

export function getCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
        return [];
    }
}

export function saveCart(cart: CartItem[]): void {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
}

export function addToCart(item: Omit<CartItem, 'quantity'>): void {
    const cart = getCart();
    const existing = cart.find((c) => c.id === item.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    saveCart(cart);
}

export function removeFromCart(id: string): void {
    saveCart(getCart().filter((c) => c.id !== id));
}

export function updateQuantity(id: string, quantity: number): void {
    if (quantity <= 0) {
        removeFromCart(id);
        return;
    }
    const cart = getCart().map((c) => (c.id === id ? { ...c, quantity } : c));
    saveCart(cart);
}

export function clearCart(): void {
    saveCart([]);
}

export function getCartCount(): number {
    return getCart().reduce((sum, c) => sum + c.quantity, 0);
}

export function getCartTotal(): number {
    return getCart().reduce((sum, c) => sum + c.price * c.quantity, 0);
}

export function formatPrice(n: number): string {
    return n.toLocaleString('vi-VN') + '₫';
}
