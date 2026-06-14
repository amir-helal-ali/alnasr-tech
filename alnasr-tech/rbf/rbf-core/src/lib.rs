//! RBF Core – Rule-Based Framework core types and traits.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A single business rule definition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub rule_type: RuleType,
    pub condition: serde_json::Value,
    pub action: serde_json::Value,
    pub priority: i32,
    pub is_active: bool,
}

/// Types of business rules supported by the framework.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RuleType {
    Validation,
    Transformation,
    Calculation,
    Workflow,
}

/// Result of evaluating a rule against input data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleEvaluationResult {
    pub rule_id: Uuid,
    pub matched: bool,
    pub output: Option<serde_json::Value>,
    pub error: Option<String>,
}

/// Trait that all RBF executors must implement.
pub trait RuleExecutor: Send + Sync {
    fn evaluate(&self, rule: &Rule, input: &serde_json::Value) -> RuleEvaluationResult;
    fn evaluate_all(&self, rules: &[Rule], input: &serde_json::Value) -> Vec<RuleEvaluationResult>;
}

/// Default rule executor using JSON path matching.
pub struct DefaultRuleExecutor;

impl RuleExecutor for DefaultRuleExecutor {
    fn evaluate(&self, rule: &Rule, input: &serde_json::Value) -> RuleEvaluationResult {
        let matched = evaluate_condition(&rule.condition, input);
        let output = if matched {
            Some(apply_action(&rule.action, input))
        } else {
            None
        };

        RuleEvaluationResult {
            rule_id: rule.id,
            matched,
            output,
            error: None,
        }
    }

    fn evaluate_all(&self, rules: &[Rule], input: &serde_json::Value) -> Vec<RuleEvaluationResult> {
        let mut results: Vec<RuleEvaluationResult> = rules
            .iter()
            .filter(|r| r.is_active)
            .map(|r| self.evaluate(r, input))
            .collect();

        // Sort by priority (highest first)
        results.sort_by(|a, b| {
            rules.iter().find(|r| r.id == a.rule_id).map(|r| r.priority).unwrap_or(0)
                .cmp(&rules.iter().find(|r| r.id == b.rule_id).map(|r| r.priority).unwrap_or(0))
        });

        results
    }
}

/// Simple condition evaluation against JSON input.
fn evaluate_condition(condition: &serde_json::Value, input: &serde_json::Value) -> bool {
    if let serde_json::Value::Object(map) = condition {
        for (key, expected) in map {
            if let Some(actual) = input.get(key) {
                if actual != expected {
                    return false;
                }
            } else {
                return false;
            }
        }
        true
    } else {
        false
    }
}

/// Apply an action by merging action data into input.
fn apply_action(action: &serde_json::Value, input: &serde_json::Value) -> serde_json::Value {
    let mut result = input.clone();
    if let (serde_json::Value::Object(result_map), serde_json::Value::Object(action_map)) =
        (&mut result, action)
    {
        for (key, value) in action_map {
            result_map.insert(key.clone(), value.clone());
        }
    }
    result
}
