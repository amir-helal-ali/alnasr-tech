//! RBF Codegen – Generates Rust code from RBF rule definitions.

use rbf_core::Rule;

/// Generate a Rust match expression from a list of rules.
pub fn generate_match_code(rules: &[Rule]) -> String {
    let mut code = String::from("match input {\n");

    for rule in rules.iter().filter(|r| r.is_active) {
        let condition_str = serde_json::to_string_pretty(&rule.condition).unwrap_or_default();
        let action_str = serde_json::to_string_pretty(&rule.action).unwrap_or_default();

        code.push_str(&format!(
            "    // Rule: {} (priority: {})\n",
            rule.name, rule.priority
        ));
        code.push_str(&format!(
            "    // Condition: {condition_str}\n"
        ));
        code.push_str(&format!(
            "    // Action: {action_str}\n\n"
        ));
    }

    code.push_str("    _ => {}\n}\n");
    code
}

/// Generate a SQL WHERE clause from a rule's condition.
pub fn generate_sql_where(rule: &Rule) -> String {
    if let serde_json::Value::Object(map) = &rule.condition {
        let clauses: Vec<String> = map
            .iter()
            .map(|(key, value)| {
                let val = match value {
                    serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    _ => "NULL".to_string(),
                };
                format!("{key} = {val}")
            })
            .collect();
        clauses.join(" AND ")
    } else {
        "1=1".to_string()
    }
}
