//! RBF Plugin – Plugin interface for extending the rule framework.

use rbf_core::RuleEvaluationResult;

/// Trait that plugins must implement to hook into the RBF pipeline.
pub trait RbfPlugin: Send + Sync {
    /// Name of the plugin.
    fn name(&self) -> &str;

    /// Called before rule evaluation. Return false to skip this rule.
    fn before_evaluate(&self, rule_name: &str, input: &serde_json::Value) -> bool {
        let _ = (rule_name, input);
        true
    }

    /// Called after rule evaluation. Can modify the result.
    fn after_evaluate(&self, result: &mut RuleEvaluationResult) {
        let _ = result;
    }

    /// Called when an error occurs during evaluation.
    fn on_error(&self, rule_name: &str, error: &str) {
        let _ = (rule_name, error);
    }
}

/// Built-in logging plugin.
pub struct LoggingPlugin;

impl RbfPlugin for LoggingPlugin {
    fn name(&self) -> &str {
        "logging"
    }

    fn after_evaluate(&self, result: &mut RuleEvaluationResult) {
        if result.matched {
            tracing::info!(rule_id = %result.rule_id, "Rule matched");
        }
    }

    fn on_error(&self, rule_name: &str, error: &str) {
        tracing::error!(rule = rule_name, error = error, "Rule evaluation error");
    }
}

/// Plugin manager that coordinates multiple plugins.
pub struct PluginManager {
    plugins: Vec<Box<dyn RbfPlugin>>,
}

impl PluginManager {
    pub fn new() -> Self {
        Self { plugins: Vec::new() }
    }

    pub fn register(&mut self, plugin: Box<dyn RbfPlugin>) {
        self.plugins.push(plugin);
    }

    pub fn before_evaluate(&self, rule_name: &str, input: &serde_json::Value) -> bool {
        self.plugins.iter().all(|p| p.before_evaluate(rule_name, input))
    }

    pub fn after_evaluate(&self, result: &mut RuleEvaluationResult) {
        for plugin in &self.plugins {
            plugin.after_evaluate(result);
        }
    }
}

impl Default for PluginManager {
    fn default() -> Self {
        Self::new()
    }
}
