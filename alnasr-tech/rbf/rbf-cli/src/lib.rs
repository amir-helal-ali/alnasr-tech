//! RBF CLI – Command-line tool for managing RBF rules.

use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "rbf", about = "RBF Rule Management CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Parse a rule from a JSON file
    Parse {
        /// Path to the rule JSON file
        file: PathBuf,
    },
    /// Generate Rust code from rules
    Codegen {
        /// Path to the rules JSON file
        file: PathBuf,
    },
    /// Validate a rule definition
    Validate {
        /// Path to the rule JSON file
        file: PathBuf,
    },
}

/// Run the RBF CLI.
pub fn run() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Parse { file } => {
            let content = std::fs::read_to_string(&file).expect("Failed to read file");
            match rbf_parser::parse_rule_json(&content) {
                Ok(rule) => println!("Parsed rule: {} (type: {:?})", rule.name, rule.rule_type),
                Err(e) => eprintln!("Parse error: {e}"),
            }
        }
        Commands::Codegen { file } => {
            let content = std::fs::read_to_string(&file).expect("Failed to read file");
            match rbf_parser::parse_rules_json(&content) {
                Ok(rules) => {
                    let code = rbf_codegen::generate_match_code(&rules);
                    println!("{code}");
                }
                Err(e) => eprintln!("Parse error: {e}"),
            }
        }
        Commands::Validate { file } => {
            let content = std::fs::read_to_string(&file).expect("Failed to read file");
            match rbf_parser::parse_rule_json(&content) {
                Ok(rule) => {
                    let where_clause = rbf_codegen::generate_sql_where(&rule);
                    println!("Valid rule. Generated SQL WHERE: {where_clause}");
                }
                Err(e) => eprintln!("Validation error: {e}"),
            }
        }
    }
}
