# NEXVAULT — Advanced Credit System & Shared Limit Architecture Plan

This document defines the architectural foundation for implementing advanced real-world credit-card systems inside NEXVAULT.

The objective is to support:
- shared credit limits
- linked credit cards
- EMI conversion systems
- revolving credit restoration
- billing cycles
- utilization tracking
- future loan-style financial systems

without destabilizing the existing financial integrity architecture.

---

# Problem Statement

Many banks provide multiple credit cards under:
- one shared credit line
- one revolving utilization pool

Examples:
- HDFC Freedom + HDFC Swiggy
- Axis Neo + Flipkart Axis
- supplementary/family cards
- business linked cards

In these systems:
- spending from any linked card reduces the same shared limit
- EMI conversions block credit limit
- monthly repayments restore available credit gradually

Traditional expense trackers model:
1 card = 1 independent balance

This is incorrect for many real-world banking systems.

NEXVAULT will support:
relationship-based credit modeling.

---

# Core Financial Architecture

The advanced credit system will follow a multi-layer financial model.

---

# Layer 1 — Credit Pool (Shared Credit Line)

## Purpose
Acts as the canonical source of truth for:
- total limit
- utilized amount
- available credit
- revolving restoration

---

## Example

### HDFC Shared Credit Pool

- Total Limit: ₹40,000
- Utilized: ₹35,000
- Available: ₹5,000

Linked Cards:
- HDFC Freedom
- HDFC Swiggy

Both cards consume from the SAME pool.

---

# Credit Pool Responsibilities

## Tracks
- total_limit
- available_limit
- utilized_limit
- blocked_emi_amount
- billing_cycle
- due_dates
- statement_dates

---

## Handles
- shared utilization calculations
- limit restoration
- EMI locking behavior
- payment reconciliation
- credit analytics

---

# Layer 2 — Linked Credit Cards

## Purpose
Represents individual physical/digital cards attached to a shared pool.

---

## Examples
- HDFC Freedom
- HDFC Swiggy
- Flipkart Axis
- Axis Neo

---

# Important Rule

Cards:
- DO NOT own independent limits
- consume from parent Credit Pool

---

# Linked Card Responsibilities

## Tracks
- card_name
- issuer
- last_four_digits
- card_network
- linked_pool_id
- individual transaction history

---

## Allows
- per-card analytics
- merchant tracking
- card-specific categorization
- spending behavior insights

while preserving shared-limit integrity.

---

# Layer 3 — EMI Obligation System

## Purpose
Tracks EMI-converted purchases and revolving credit restoration.

---

# Example

Converted Purchase:
- Principal: ₹35,000
- Tenure: 12 months
- Monthly EMI: ₹3092
- Remaining Months: 8

---

# EMI Behavior

When:
purchase converts to EMI

the system:
- blocks utilized credit
- creates repayment schedule
- restores available limit gradually as EMI payments are made

---

# EMI Responsibilities

## Tracks
- principal_amount
- monthly_emi
- remaining_balance
- remaining_months
- interest_rate
- linked_transaction
- linked_credit_pool
- due_dates
- payment_history

---

## Handles
- monthly restoration calculations
- outstanding EMI analytics
- upcoming EMI reminders
- repayment progress tracking

---

# Layer 4 — Billing Cycle Engine

## Purpose
Models real-world credit-card billing systems.

---

# Tracks

- statement generation date
- payment due date
- minimum due
- total outstanding
- interest accumulation
- payment status

---

# Future Possibilities

- auto-generated statements
- billing reminders
- overdue warnings
- interest forecasting
- credit-score simulations

---

# Layer 5 — Credit Utilization Engine

## Purpose
Maintains deterministic available-credit calculations.

---

# Core Formula

available_limit =
total_limit
- utilized_limit
- blocked_emi_amount
+ repayments

---

# Utilization Responsibilities

## Handles
- shared-card spending
- EMI blocking
- repayments
- refunds
- reversals
- partial restorations

---

# Account Type Architecture Expansion

The current account system must evolve into:
behavior-based financial account types.

---

# Planned Account Types

## 1. Debit Accounts
Examples:
- bank accounts
- wallets
- cash

Rules:
- cannot overspend
- balance decreases directly

---

## 2. Independent Credit Cards
Rules:
- independent limit
- separate utilization

---

## 3. Shared Credit Pools
Rules:
- multiple cards share one utilization source

---

## 4. EMI / Loan Obligations
Rules:
- scheduled repayments
- outstanding tracking

---

# UX Architecture

## User Flow

### Step 1
Create Credit Pool

Example:
"HDFC Shared Limit"

Input:
- total limit
- billing cycle
- due date

---

### Step 2
Add Linked Cards

Example:
- HDFC Freedom
- HDFC Swiggy

Attach to:
"HDFC Shared Limit"

---

### Step 3
Track Transactions

User selects:
- card used

System:
- records card
- deducts from shared pool

---

### Step 4
Convert Expense To EMI

User converts:
transaction → EMI plan

System:
- creates EMI obligation
- blocks utilization
- creates repayment schedule

---

# Analytics Possibilities

Future analytics may include:

## Credit Utilization
- overall utilization %
- issuer-wise utilization
- card-wise utilization

---

## EMI Analytics
- upcoming EMIs
- total outstanding EMI debt
- repayment progress
- monthly EMI burden

---

## Smart Insights
Examples:
- "Your HDFC shared utilization exceeded 85%"
- "EMI obligations increased this month"
- "Axis utilization is approaching billing threshold"

---

# Notification Possibilities

Examples:
- due-soon reminders
- EMI due alerts
- utilization warnings
- over-limit prevention
- billing cycle reminders

---

# Important Engineering Principles

## DO NOT
- aggressively rewrite existing financial systems
- break current transaction integrity
- hardcode issuer-specific logic

---

## DO
- keep architecture modular
- preserve deterministic balance logic
- maintain UTC timestamp consistency
- integrate incrementally

---

# Implementation Strategy

This system should be implemented in phases.

---

# Phase A
Architecture & schema modeling

---

# Phase B
Shared credit pool infrastructure

---

# Phase C
Linked card relationships

---

# Phase D
EMI engine & repayment tracking

---

# Phase E
Billing cycle intelligence

---

# Phase F
Advanced analytics & insights

---

# Future Scalability

This architecture prepares NEXVAULT for:
- loan systems
- BNPL systems
- family/shared accounts
- supplementary cards
- business credit systems
- credit health scoring
- advanced financial intelligence

---

# Final Goal

The goal is to transform NEXVAULT from:
"a transaction tracker"

into:

"a realistic financial management platform capable of modeling real-world banking and credit ecosystems."