//! RBF Runtime – Executes rules against input data at runtime.

use rbf_core::{DefaultRuleExecutor, Rule, RuleEvaluationResult, RuleExecutor};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// The RBF runtime engine that loads, caches, and evaluates rules.
pub struct RbfRuntime {
    executor: Arc<dyn RuleExecutor>,
    rules: Arc<RwLock<HashMap<String, Vec<Rule>>>>,
}

impl RbfRuntime {
    /// Create a new runtime with the default rule executor.
    pub fn new() -> Self {
        Self {
            executor: Arc::new(DefaultRuleExecutor),
            rules: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Create a runtime with a custom rule executor.
    pub fn with_executor(executor: Arc<dyn RuleExecutor>) -> Self {
        Self {
            executor,
            rules: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Load rules for a specific tenant.
    pub async fn load_rules(&self, tenant_id: &str, rules: Vec<Rule>) {
        let mut guard = self.rules.write().await;
        guard.insert(tenant_id.to_string(), rules);
    }

    /// Evaluate all rules for a tenant against the given input.
    pub async fn evaluate(
        &self,
        tenant_id: &str,
        input: &serde_json::Value,
    ) -> Vec<RuleEvaluationResult> {
        let guard = self.rules.read().await;
        if let Some(rules) = guard.get(tenant_id) {
            self.executor.evaluate_all(rules, input)
        } else {
            Vec::new()
        }
    }

    /// Clear cached rules for a tenant.
    pub async fn clear_rules(&self, tenant_id: &str) {
        let mut guard = self.rules.write().await;
        guard.remove(tenant_id);
    }

    /// Clear all cached rules.
    pub async fn clear_all(&self) {
        let mut guard = self.rules.write().await;
        guard.clear();
    }
}

impl Default for RbfRuntime {
    fn default() -> Self {
        Self::new()
    }
}
