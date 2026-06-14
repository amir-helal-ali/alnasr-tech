//! RBF Parser – parses rule definitions from various formats.

use rbf_core::{Rule, RuleType};
use serde_json;
use uuid::Uuid;

/// Parse a rule from a JSON string.
pub fn parse_rule_json(json: &str) -> Result<Rule, RuleParseError> {
    let rule: Rule = serde_json::from_str(json)?;
    Ok(rule)
}

/// Parse multiple rules from a JSON array string.
pub fn parse_rules_json(json: &str) -> Result<Vec<Rule>, RuleParseError> {
    let rules: Vec<Rule> = serde_json::from_str(json)?;
    Ok(rules)
}

/// Parse a rule from a simplified DSL format.
/// Format: "WHEN <field>=<value> THEN <action_key>=<action_value>"
pub fn parse_rule_dsl(dsl: &str) -> Result<Rule, RuleParseError> {
    let parts: Vec<&str> = dsl.splitn(2, " THEN ").collect();
    if parts.len() != 2 {
        return Err(RuleParseError::InvalidFormat(
            "Expected format: WHEN <condition> THEN <action>".into(),
        ));
    }

    let condition_part = parts[0].trim().strip_prefix("WHEN ").unwrap_or(parts[0].trim());
    let action_part = parts[1].trim();

    let mut condition = serde_json::Map::new();
    for pair in condition_part.split(',') {
        let kv: Vec<&str> = pair.trim().splitn(2, '=').collect();
        if kv.len() == 2 {
            condition.insert(kv[0].trim().to_string(), serde_json::Value::String(kv[1].trim().to_string()));
        }
    }

    let mut action = serde_json::Map::new();
    for pair in action_part.split(',') {
        let kv: Vec<&str> = pair.trim().splitn(2, '=').collect();
        if kv.len() == 2 {
            action.insert(kv[0].trim().to_string(), serde_json::Value::String(kv[1].trim().to_string()));
        }
    }

    Ok(Rule {
        id: Uuid::new_v4(),
        name: format!("DSL rule {}", Uuid::new_v4()),
        description: None,
        rule_type: RuleType::Validation,
        condition: serde_json::Value::Object(condition),
        action: serde_json::Value::Object(action),
        priority: 0,
        is_active: true,
    })
}

/// Errors that can occur during rule parsing.
#[derive(Debug, thiserror::Error)]
pub enum RuleParseError {
    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Invalid format: {0}")]
    InvalidFormat(String),
}
