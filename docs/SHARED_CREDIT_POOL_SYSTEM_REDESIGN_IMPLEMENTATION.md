PROJECT: Shared Credit Pool System Redesign (Full Replacement)

IMPORTANT:
Read the attached MD implementation file completely before making any changes.

GOAL:
Completely redesign and replace the existing Shared Credit Pool system with a cleaner, scalable, fintech-grade architecture and premium UI/UX.

This is NOT a patch update.
This is a controlled architecture replacement of the existing shared limit implementation.

The new implementation must correctly support:

* Shared issuer-level credit pools
* Multiple cards under one shared pool
* Card-specific maximum usable limits
* Dynamic synchronized available limits
* Proper utilization propagation
* Real-time recalculation logic
* Clean grouped UI/UX
* Responsive premium fintech interface

EXAMPLE BEHAVIOR:

Pool Total Limit:
₹40,000

Cards:

* HDFC Freedom → max usable ₹40,000
* HDFC Swiggy → max usable ₹18,000

If total pool available becomes ₹30,000:

* Freedom available = ₹30,000
* Swiggy available = ₹18,000

If total pool available becomes ₹12,000:

* Freedom available = ₹12,000
* Swiggy available = ₹12,000

This behavior must be dynamically computed and synchronized everywhere in the application.

---

## CRITICAL ARCHITECTURE REQUIREMENTS

The implementation MUST follow:

1. SECURITY-FIRST DEVELOPMENT
2. ADDITIVE SAFE REPLACEMENT
3. LOW REGRESSION ARCHITECTURE
4. CLEAN STATE MANAGEMENT
5. PRODUCTION-GRADE LOGIC
6. PREMIUM FINTECH UI CONSISTENCY
7. RESPONSIVE MOBILE-FIRST DESIGN

---

## IMPLEMENTATION REQUIREMENTS

You MUST:

* Audit the existing shared limit implementation first
* Remove broken or redundant shared-limit logic
* Replace old UI with cleaner grouped pool UI
* Preserve existing design language
* Implement dynamic derived calculations
* Ensure synchronized recalculation across the app
* Maintain dashboard compatibility
* Maintain transaction compatibility
* Preserve existing auth systems
* Preserve deployment compatibility
* Maintain responsive behavior

---

## REQUIRED ARCHITECTURE

Implement proper separation between:

1. Shared Credit Pool

* total limit
* utilized amount
* available amount
* issuer grouping

2. Individual Credit Cards

* linked pool
* max usable limit
* utilized amount
* derived available amount

3. Derived Calculation Layer
   DO NOT store duplicated computed values unnecessarily.

Card available limit should be dynamically derived using:
min(card.maxUsableLimit, pool.availableAmount)

Avoid stale synchronization logic.

---

## UI / UX REQUIREMENTS

The new UI should:

* Group cards visually by shared pool
* Show shared utilization progress
* Show per-card usage clearly
* Show effective available limit
* Display why limits are capped when needed
* Use premium fintech styling
* Maintain layout consistency
* Be mobile responsive
* Improve visual hierarchy
* Reduce confusion around shared limits

Preferred UX:

* expandable pool sections
* grouped cards
* clear utilization indicators
* clean summary headers
* smooth visual flow

DO NOT redesign unrelated pages.

---

## IMPORTANT: MODEL USAGE OPTIMIZATION

To reduce unnecessary long-context model usage:

DO NOT:

* generate massive explanations
* rewrite unrelated systems
* generate unnecessary documentation
* produce verbose outputs
* scan unrelated files repeatedly
* refactor stable systems unnecessarily
* generate speculative improvements

ONLY:

* focus on the approved scope
* implement required logic
* implement required UI
* keep outputs concise
* avoid unnecessary token usage
* avoid repeated reasoning dumps

If uncertain:
ASK before generating large changes.

DO NOT generate additional systems/features unless explicitly approved.

---

## STRICT DO NOT MODIFY RULES

DO NOT:

* modify authentication architecture
* modify unrelated transaction systems
* modify deployment configuration
* modify email systems
* modify unrelated dashboard systems
* redesign entire frontend
* aggressively refactor stable modules
* auto-test
* auto-deploy
* auto-push

---

## MANUAL TESTING ONLY

The user will manually test:

* shared pool calculations
* card utilization
* repayments
* transaction synchronization
* dashboard updates
* edge cases
* responsive UI
* mobile layouts
* production deployment

DO NOT assume correctness automatically.

---

## IMPLEMENTATION PRIORITY

Priority order:

1. Correct shared pool logic
2. Synchronization stability
3. Clean state architecture
4. Regression safety
5. Premium UI/UX
6. Responsiveness
7. Performance optimization

---

## FINAL REQUIREMENT

This implementation must feel:

* production-grade
* scalable
* visually premium
* logically accurate
* financially intuitive
* low-regression
* maintainable

Focus on stability and correctness over unnecessary complexity.
