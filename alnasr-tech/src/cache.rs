//! Simple in-memory cache layer.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// A cache entry with an expiration time.
struct CacheEntry<V> {
    value: V,
    expires_at: Instant,
}

impl<V> CacheEntry<V> {
    fn new(value: V, ttl: Duration) -> Self {
        Self {
            value,
            expires_at: Instant::now() + ttl,
        }
    }

    fn is_expired(&self) -> bool {
        Instant::now() > self.expires_at
    }
}

/// Thread-safe in-memory cache with TTL support.
pub struct MemoryCache<V> {
    store: Mutex<HashMap<String, CacheEntry<V>>>,
    default_ttl: Duration,
}

impl<V> MemoryCache<V> {
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            store: Mutex::new(HashMap::new()),
            default_ttl,
        }
    }

    pub fn get(&self, key: &str) -> Option<V>
    where
        V: Clone,
    {
        let store = self.store.lock().ok()?;
        let entry = store.get(key)?;
        if entry.is_expired() {
            None
        } else {
            Some(entry.value.clone())
        }
    }

    pub fn set(&self, key: &str, value: V) {
        self.set_with_ttl(key, value, self.default_ttl);
    }

    pub fn set_with_ttl(&self, key: &str, value: V, ttl: Duration) {
        if let Ok(mut store) = self.store.lock() {
            store.insert(key.to_string(), CacheEntry::new(value, ttl));
        }
    }

    pub fn remove(&self, key: &str) {
        if let Ok(mut store) = self.store.lock() {
            store.remove(key);
        }
    }

    /// Evict all expired entries.
    pub fn evict_expired(&self) {
        if let Ok(mut store) = self.store.lock() {
            store.retain(|_, entry| !entry.is_expired());
        }
    }
}
