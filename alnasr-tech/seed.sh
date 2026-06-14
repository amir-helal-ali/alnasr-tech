#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# Al-Nasr Tech ERP — Seed Data Script
# ═══════════════════════════════════════════════════════════════════════
# This script seeds the database via the Rust backend REST API.
# It ensures proper Argon2 password hashing by using the register endpoint.
#
# Usage:
#   chmod +x seed.sh
#   ./seed.sh                          # Default: http://localhost:3001
#   ./seed.sh http://your-server:3001  # Custom URL
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

API="${1:-http://localhost:3001}"
TOKEN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[SEED]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# ── Check backend health ──────────────────────────────────────────────
check_health() {
    info "Checking backend health at $API..."
    if ! curl -sf "$API/health" > /dev/null 2>&1; then
        err "Backend is not reachable at $API"
        err "Make sure the server is running: docker compose up -d"
        exit 1
    fi
    log "Backend is healthy"
}

# ── Register admin user ───────────────────────────────────────────────
register_admin() {
    info "Registering admin user..."
    RESPONSE=$(curl -sf -X POST "$API/api/auth/register" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@alnasr.tech",
            "password": "Admin@123",
            "name": "أمير هلال"
        }' 2>&1) || true

    if echo "$RESPONSE" | grep -q '"token"'; then
        TOKEN=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")
        log "Admin user registered successfully"
        log "  Email:    admin@alnasr.tech"
        log "  Password: Admin@123"
    elif echo "$RESPONSE" | grep -q "already registered"; then
        warn "Admin user already exists, logging in..."
        login_admin
    else
        err "Failed to register admin: $RESPONSE"
        exit 1
    fi
}

# ── Login admin ───────────────────────────────────────────────────────
login_admin() {
    info "Logging in as admin..."
    RESPONSE=$(curl -sf -X POST "$API/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@alnasr.tech",
            "password": "Admin@123"
        }' 2>&1)

    TOKEN=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")

    if [ -z "$TOKEN" ]; then
        err "Failed to login: $RESPONSE"
        exit 1
    fi
    log "Admin logged in successfully"
}

# ── Create customers ──────────────────────────────────────────────────
create_customers() {
    info "Creating customers..."
    local customers=(
        '{"name":"شركة النيل للتقنية","email":"info@niletech.eg","phone":"+20 2 2345 6789","address":"القاهرة، مصر الجديدة، شارع النيل","city":"القاهرة","country":"EG","tax_id":"300-123-4567"}'
        '{"name":"مؤسسة الأهرام","email":"sales@ahram.eg","phone":"+20 2 2789 0123","address":"الجيزة، الهرم، شارع الأهرام","city":"الجيزة","country":"EG","tax_id":"300-234-5678"}'
        '{"name":"شركة القاهرة الرقمية","email":"contact@cairodigital.eg","phone":"+20 2 2456 7890","address":"القاهرة، المعادي، شارع 9","city":"القاهرة","country":"EG","tax_id":"300-345-6789"}'
        '{"name":"مجموعة الإسكندرية","email":"info@alexgroup.eg","phone":"+20 3 5123 4567","address":"الإسكندرية، سموحة، شارع 14 مايو","city":"الإسكندرية","country":"EG","tax_id":"300-456-7890"}'
        '{"name":"شركة الدلتا للخدمات","email":"info@deltaservices.eg","phone":"+20 50 234 5678","address":"المنصورة، شارع الجلاء","city":"المنصورة","country":"EG","tax_id":"300-567-8901"}'
        '{"name":"شركة الصحراء للإنشاءات","email":"info@saharaconstruct.eg","phone":"+20 2 3456 7890","address":"القاهرة، مدينة نصر، شارع عباس العقاد","city":"القاهرة","country":"EG","tax_id":"300-678-9012"}'
        '{"name":"مؤسسة النور للتجارة","email":"info@alnourtrade.eg","phone":"+20 2 4567 8901","address":"القاهرة، وسط البلد، شارع طلعت حرب","city":"القاهرة","country":"EG","tax_id":"300-789-0123"}'
        '{"name":"شركة الوادي للبرمجيات","email":"info@wadisoft.eg","phone":"+20 88 234 5678","address":"أسيوط، شارع صلاح سالم","city":"أسيوط","country":"EG","tax_id":"300-890-1234","notes":"عميل غير نشط"}'
    )

    local count=0
    for customer in "${customers[@]}"; do
        RESPONSE=$(curl -sf -X POST "$API/api/customers" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$customer" 2>&1) || true

        if echo "$RESPONSE" | grep -q '"id"'; then
            count=$((count + 1))
        else
            warn "Customer may already exist: $(echo "$customer" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])" 2>/dev/null || echo 'unknown')"
        fi
    done
    log "Customers created: $count"
}

# ── Create invoices ───────────────────────────────────────────────────
create_invoices() {
    info "Creating invoices..."
    # First, get customer IDs
    CUSTOMERS_JSON=$(curl -sf "$API/api/customers?per_page=20" \
        -H "Authorization: Bearer $TOKEN" 2>&1)

    # Extract customer IDs using python
    CUST_IDS=($(echo "$CUSTOMERS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data.get('customers', []):
    print(c['id'])
" 2>/dev/null || echo ""))

    if [ ${#CUST_IDS[@]} -lt 3 ]; then
        warn "Not enough customers to create invoices"
        return
    fi

    # Create invoices for different customers
    local invoices=(
        "{\"customer_id\":\"${CUST_IDS[0]}\",\"items\":[{\"description\":\"خدمات تطوير الموقع الإلكتروني\",\"quantity\":1,\"unit_price\":\"30000\",\"tax_rate\":\"14\"},{\"description\":\"صيانة شهرية - 6 أشهر\",\"quantity\":6,\"unit_price\":\"3333.33\",\"tax_rate\":\"14\"}],\"due_date\":\"2025-07-01T00:00:00Z\"}"
        "{\"customer_id\":\"${CUST_IDS[1]}\",\"items\":[{\"description\":\"نظام إدارة المحتوى\",\"quantity\":1,\"unit_price\":\"50000\",\"tax_rate\":\"14\"},{\"description\":\"تدريب الفريق\",\"quantity\":5,\"unit_price\":\"5000\",\"tax_rate\":\"14\"}],\"due_date\":\"2025-07-01T00:00:00Z\"}"
        "{\"customer_id\":\"${CUST_IDS[2]}\",\"items\":[{\"description\":\"تصميم واجهة المستخدم\",\"quantity\":1,\"unit_price\":\"20000\",\"tax_rate\":\"14\"},{\"description\":\"تصميم شعار\",\"quantity\":3,\"unit_price\":\"5000\",\"tax_rate\":\"14\"}],\"due_date\":\"2025-07-15T00:00:00Z\"}"
        "{\"customer_id\":\"${CUST_IDS[3]}\",\"items\":[{\"description\":\"نظام ERP متكامل\",\"quantity\":1,\"unit_price\":\"100000\",\"tax_rate\":\"14\"},{\"description\":\"نشر وتكوين\",\"quantity\":1,\"unit_price\":\"20000\",\"tax_rate\":\"14\"}],\"due_date\":\"2025-07-20T00:00:00Z\"}"
        "{\"customer_id\":\"${CUST_IDS[0]}\",\"items\":[{\"description\":\"تطبيق جوال - المرحلة الأولى\",\"quantity\":1,\"unit_price\":\"25000\",\"tax_rate\":\"14\"}],\"due_date\":\"2025-08-01T00:00:00Z\"}"
        "{\"customer_id\":\"${CUST_IDS[4]}\",\"items\":[{\"description\":\"استشارات تقنية\",\"quantity\":15,\"unit_price\":\"3000\",\"tax_rate\":\"14\"}],\"due_date\":\"2025-07-01T00:00:00Z\"}"
    )

    local INV_IDS=()
    local count=0
    for invoice in "${invoices[@]}"; do
        RESPONSE=$(curl -sf -X POST "$API/api/invoices" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$invoice" 2>&1) || true

        if echo "$RESPONSE" | grep -q '"id"'; then
            INV_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
            if [ -n "$INV_ID" ]; then
                INV_IDS+=("$INV_ID")
                count=$((count + 1))
            fi
        fi
    done
    log "Invoices created: $count"

    # Issue some invoices (change status from draft to issued)
    for inv_id in "${INV_IDS[@]:0:4}"; do
        curl -sf -X PATCH "$API/api/invoices/$inv_id/status" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d '{"status":"issued"}' > /dev/null 2>&1 || true
    done

    # Mark first two as paid
    for inv_id in "${INV_IDS[@]:0:2}"; do
        curl -sf -X PATCH "$API/api/invoices/$inv_id/status" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d '{"status":"paid"}' > /dev/null 2>&1 || true
    done

    log "Invoice statuses updated"
}

# ── Create payments ───────────────────────────────────────────────────
create_payments() {
    info "Creating payments..."
    # Get paid invoices
    PAID_INV_JSON=$(curl -sf "$API/api/invoices?status=paid&per_page=10" \
        -H "Authorization: Bearer $TOKEN" 2>&1)

    PAID_INV_IDS=($(echo "$PAID_INV_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for inv in data.get('invoices', []):
    print(inv['id'])
" 2>/dev/null || echo ""))

    local count=0
    local methods=("bank_transfer" "cash" "credit_card" "check")
    local refs=("TRX-2024-001" "" "CC-2024-003" "CHK-2024-004")

    for i in "${!PAID_INV_IDS[@]}"; do
        if [ $i -ge ${#methods[@]} ]; then break; fi
        # Get invoice total
        INV_DETAIL=$(curl -sf "$API/api/invoices/${PAID_INV_IDS[$i]}" \
            -H "Authorization: Bearer $TOKEN" 2>&1)
        TOTAL=$(echo "$INV_DETAIL" | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])" 2>/dev/null || echo "0")

        if [ "$TOTAL" != "0" ]; then
            PAYLOAD="{\"invoice_id\":\"${PAID_INV_IDS[$i]}\",\"amount\":\"$TOTAL\",\"method\":\"${methods[$i]}\""
            if [ -n "${refs[$i]}" ]; then
                PAYLOAD="$PAYLOAD,\"reference\":\"${refs[$i]}\""
            fi
            PAYLOAD="$PAYLOAD}"

            curl -sf -X POST "$API/api/payments" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "$PAYLOAD" > /dev/null 2>&1 || true
            count=$((count + 1))
        fi
    done
    log "Payments created: $count"
}

# ── Create accountant user ────────────────────────────────────────────
create_accountant() {
    info "Creating accountant user..."
    # Get admin's tenant_id
    ME_JSON=$(curl -sf "$API/api/auth/me" \
        -H "Authorization: Bearer $TOKEN" 2>&1)
    TENANT_ID=$(echo "$ME_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tenant_id',''))" 2>/dev/null || echo "")

    if [ -n "$TENANT_ID" ]; then
        curl -sf -X POST "$API/api/users" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "{
                \"email\": \"accountant@alnasr.tech\",
                \"password\": \"Accountant@123\",
                \"name\": \"أحمد محمد\",
                \"tenant_id\": \"$TENANT_ID\",
                \"role\": \"accountant\"
            }" > /dev/null 2>&1 || true
        log "Accountant user created (accountant@alnasr.tech / Accountant@123)"
    fi
}

# ── Main ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Al-Nasr Tech ERP — Database Seeder"
echo "═══════════════════════════════════════════════════════════════"
echo ""

check_health
register_admin
create_customers
create_invoices
create_payments
create_accountant

echo ""
echo "═══════════════════════════════════════════════════════════════"
log "Database seeded successfully!"
echo ""
log "Login credentials:"
log "  Admin:      admin@alnasr.tech / Admin@123"
log "  Accountant: accountant@alnasr.tech / Accountant@123"
echo "═══════════════════════════════════════════════════════════════"
