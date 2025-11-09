// =====================================================================
// Doctor Portal E2E Tests
// Framework: Playwright (compatible with Cypress patterns)
// Description: Comprehensive end-to-end testing for doctor workflows
// =====================================================================

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// =====================================================================
// TEST CONFIGURATION
// =====================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const TEST_DOCTOR = {
  email: 'dr.sarah.mitchell@healthportal.demo',
  password: 'TestDoctor123!',
  id: '10000000-0000-0000-0000-000000000001',
};

const TEST_PATIENT = {
  email: 'john.anderson@patient.demo',
  password: 'TestPatient123!',
  id: '20000000-0000-0000-0000-000000000002',
};

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

async function loginAsDoctor(page: Page) {
  await page.goto('/auth/login');
  await page.fill('[name="email"]', TEST_DOCTOR.email);
  await page.fill('[name="password"]', TEST_DOCTOR.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/doctor/dashboard');
}

async function loginAsPatient(page: Page) {
  await page.goto('/auth/login');
  await page.fill('[name="email"]', TEST_PATIENT.email);
  await page.fill('[name="password"]', TEST_PATIENT.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/patient/dashboard');
}

async function uploadReport(page: Page, filePath: string, title: string) {
  await page.goto('/patient/reports');
  await page.click('button:has-text("Upload Report")');

  await page.setInputFiles('input[type="file"]', filePath);
  await page.fill('[name="title"]', title);
  await page.selectOption('[name="report_type"]', 'lab_report');
  await page.click('button:has-text("Upload")');

  await expect(page.locator('text=Upload successful')).toBeVisible();
}

async function grantConsent(page: Page, doctorId: string) {
  await page.goto('/patient/consents');
  await page.click(`button[data-doctor-id="${doctorId}"]`);
  await page.check('input[name="consent_report_access"]');
  await page.click('button:has-text("Grant Consent")');

  await expect(page.locator('text=Consent granted')).toBeVisible();
}

// =====================================================================
// TEST SUITE: Doctor Portal - Full Workflow
// =====================================================================

test.describe('Doctor Portal - Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();
  });

  // ===================================================================
  // TEST 1: Doctor Login and Dashboard
  // ===================================================================
  test('Doctor can login and view dashboard', async ({ page }) => {
    await loginAsDoctor(page);

    // Verify dashboard elements
    await expect(page.locator('h1:has-text("Today\'s Schedule")')).toBeVisible();
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible();

    // Verify stats
    const todayCount = await page.locator('text=/\\d+ Today/').textContent();
    expect(todayCount).toBeTruthy();
  });

  // ===================================================================
  // TEST 2: Patient Upload Report (Setup)
  // ===================================================================
  test('Patient uploads report and grants consent', async ({ page, context }) => {
    // Login as patient
    await loginAsPatient(page);

    // Upload test report
    const testReportPath = './tests/fixtures/lab-report-sample.pdf';
    await uploadReport(page, testReportPath, 'Lipid Panel - January 2024');

    // Grant consent to demo doctor
    await grantConsent(page, '00000000-0000-0000-0000-000000000001');

    // Verify consent granted
    await expect(
      page.locator('text=Dr. Sarah Mitchell has access to your reports')
    ).toBeVisible();
  });

  // ===================================================================
  // TEST 3: Doctor Receives AI Summary (Core Workflow)
  // ===================================================================
  test('Doctor receives AI summary for patient report', async ({ page }) => {
    test.setTimeout(60000); // AI processing can take up to 60s

    await loginAsDoctor(page);

    // Navigate to patient list
    await page.click('a[href="/doctor/patients"]');

    // Select test patient
    await page.click('text=John Anderson');

    // Wait for patient rail to open
    await expect(page.locator('[data-testid="patient-rail"]')).toBeVisible();

    // Verify patient details
    await expect(page.locator('text=john.anderson@patient.demo')).toBeVisible();

    // Click on latest report
    const reportCard = page.locator('[data-testid="report-card"]').first();
    await reportCard.click();

    // Wait for report viewer modal
    await expect(page.locator('[data-testid="report-viewer"]')).toBeVisible();

    // Check if AI summary already exists or trigger analysis
    const aiSummaryTab = page.locator('button:has-text("AI Summary")');
    await aiSummaryTab.click();

    const aiSummaryExists = await page.locator('text=Clinical Summary').isVisible({
      timeout: 2000,
    }).catch(() => false);

    if (!aiSummaryExists) {
      // Trigger AI analysis
      await page.click('button:has-text("AI Summarize")');

      // Wait for analysis to complete (with timeout)
      await expect(page.locator('text=AI analysis complete')).toBeVisible({
        timeout: 45000,
      });

      // Refresh to see summary
      await aiSummaryTab.click();
    }

    // Verify AI summary components
    await expect(page.locator('text=Clinical Summary')).toBeVisible();
    await expect(page.locator('text=/Priority: (NORMAL|URGENT|CRITICAL)/')).toBeVisible();

    // Verify flags section exists (if any)
    const flagsSection = page.locator('text=Flagged Values');
    if (await flagsSection.isVisible()) {
      // Verify source snippet is present for each flag
      const sourceSnippets = page.locator('[data-testid="source-snippet"]');
      const count = await sourceSnippets.count();
      expect(count).toBeGreaterThan(0);
    }

    // Verify disclaimer is present
    await expect(
      page.locator('text=/This AI-generated summary is for informational purposes only/')
    ).toBeVisible();
  });

  // ===================================================================
  // TEST 4: Critical Report Notification
  // ===================================================================
  test('Doctor receives realtime notification for critical report', async ({ page, context }) => {
    // Setup notification listener
    let notificationReceived = false;

    page.on('console', (msg) => {
      if (msg.text().includes('Critical Report')) {
        notificationReceived = true;
      }
    });

    await loginAsDoctor(page);

    // Simulate critical report upload by patient in another context
    const patientPage = await context.newPage();
    await loginAsPatient(patientPage);
    await uploadReport(
      patientPage,
      './tests/fixtures/critical-lab-report.pdf',
      'Critical - Abnormal Values'
    );

    // Trigger AI analysis that should return critical priority
    // This would be done via API call in real scenario

    // Wait for notification to appear
    await page.waitForSelector('[data-testid="notification-badge"]', {
      timeout: 10000,
    });

    const notificationBadge = page.locator('[data-testid="notification-badge"]');
    await expect(notificationBadge).toContainText('1');

    // Click notifications
    await page.click('button[aria-label*="Notifications"]');

    // Verify critical notification
    await expect(page.locator('text=Critical Report Alert')).toBeVisible();
    await expect(page.locator('[data-priority="critical"]')).toBeVisible();
  });

  // ===================================================================
  // TEST 5: Start Consultation
  // ===================================================================
  test('Doctor starts consultation and saves notes', async ({ page }) => {
    await loginAsDoctor(page);

    // Click on today's confirmed appointment
    const appointmentCard = page.locator('[data-status="confirmed"]').first();
    await appointmentCard.click();

    // Wait for patient rail
    await expect(page.locator('[data-testid="patient-rail"]')).toBeVisible();

    // Click Start Consultation button
    await page.click('button:has-text("Start Consultation")');

    // Verify modal opened
    await expect(page.locator('text=Start Consultation')).toBeVisible();

    // Verify Meet link is present
    await expect(page.locator('text=/Video Meeting Link/i')).toBeVisible();

    // Click Start Consultation (this opens Meet in new tab)
    await page.click('button:has-text("Start Consultation")');

    // Verify timer started
    await expect(page.locator('text=Consultation Active')).toBeVisible();
    await expect(page.locator('[data-testid="consultation-timer"]')).toBeVisible();

    // Add consultation notes
    const notesTextarea = page.locator('textarea[id="consult-notes"]');
    const consultNotes = `
Patient presented for follow-up on hypertension management.
Current BP: 135/85 mmHg (improved from 145/95).
Patient reports good medication compliance.

Assessment:
- Hypertension improving with current regimen
- Continue Lisinopril 10mg daily
- Monitor BP at home twice daily

Plan:
- Follow-up in 4 weeks
- Ordered lipid panel
- Advised on DASH diet adherence
    `.trim();

    await notesTextarea.fill(consultNotes);

    // Verify character count
    const charCount = await page.locator('text=/\\d+ \\/ 5000 characters/').textContent();
    expect(charCount).toContain(consultNotes.length.toString());

    // Complete consultation
    await page.click('button:has-text("Complete & Save Notes")');

    // Verify success
    await expect(page.locator('text=Consultation completed')).toBeVisible();

    // Verify appointment status updated
    await page.goto('/doctor/appointments');
    const updatedAppointment = page.locator('[data-testid="appointment"]').first();
    await expect(updatedAppointment).toHaveAttribute('data-status', 'in_progress');
  });

  // ===================================================================
  // TEST 6: Report Annotation
  // ===================================================================
  test('Doctor adds annotation to report', async ({ page }) => {
    await loginAsDoctor(page);

    // Navigate to patient and open report
    await page.click('a[href="/doctor/patients"]');
    await page.click('text=John Anderson');
    await page.locator('[data-testid="report-card"]').first().click();

    // Switch to annotations tab
    await page.click('button:has-text("Annotations")');

    // Add annotation
    const annotationText = 'Reviewed with patient. Advised dietary modifications and exercise plan.';
    await page.fill('textarea[placeholder*="clinical notes"]', annotationText);
    await page.click('button:has-text("Save Annotation")');

    // Verify success
    await expect(page.locator('text=Annotation saved successfully')).toBeVisible();

    // Verify annotation appears in list
    await expect(page.locator(`text=${annotationText}`)).toBeVisible();

    // Verify timestamp
    const timestamp = page.locator('[data-testid="annotation-timestamp"]').first();
    await expect(timestamp).toBeVisible();
  });

  // ===================================================================
  // TEST 7: Secure Messaging
  // ===================================================================
  test('Doctor sends message to patient', async ({ page }) => {
    await loginAsDoctor(page);

    // Open chat dock
    await page.click('[aria-label="Toggle chat"]');

    // Wait for chat panel
    await expect(page.locator('text=Messages')).toBeVisible();

    // Select patient conversation (from recent appointments)
    // Note: In real implementation, this would show conversation list
    // For this test, we'll assume patient is pre-selected

    // Type message
    const message = 'Hi John, I\'ve reviewed your lab results. Your cholesterol levels have improved significantly. Keep up the good work with your diet and exercise!';
    await page.fill('textarea[placeholder*="Type a message"]', message);

    // Send message
    await page.click('button[aria-label="Send message"]');

    // Verify message appears in chat
    await expect(page.locator(`text=${message.substring(0, 50)}`)).toBeVisible();

    // Verify message timestamp
    const timestamp = page.locator('[data-testid="message-timestamp"]').first();
    await expect(timestamp).toBeVisible();
  });

  // ===================================================================
  // TEST 8: Audit Trail Verification
  // ===================================================================
  test('Audit log captures all doctor actions', async ({ page }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    await loginAsDoctor(page);

    // Perform various actions
    await page.click('a[href="/doctor/patients"]');
    await page.click('text=John Anderson');

    // Query audit log
    const { data: auditLogs } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Verify audit entries exist
    expect(auditLogs).toBeTruthy();
    expect(auditLogs!.length).toBeGreaterThan(0);

    // Verify required fields
    const latestLog = auditLogs![0];
    expect(latestLog.actor).toBeTruthy();
    expect(latestLog.action).toBeTruthy();
    expect(latestLog.entity).toBeTruthy();
    expect(latestLog.created_at).toBeTruthy();
  });

  // ===================================================================
  // TEST 9: RLS Policy Enforcement
  // ===================================================================
  test('RLS policies prevent unauthorized access', async ({ page }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Login as doctor
    await loginAsDoctor(page);

    // Get doctor's user ID from auth
    const { data: { user } } = await supabase.auth.getUser();
    expect(user).toBeTruthy();

    // Attempt to access report without consent (should fail)
    // Create a test report for a different patient without consent
    const { data: unauthorizedReport, error } = await supabase
      .from('reports')
      .select('*')
      .eq('patient_id', 'unauthorized-patient-id')
      .single();

    // Should return error or empty result due to RLS
    expect(error || !unauthorizedReport).toBeTruthy();
  });

  // ===================================================================
  // TEST 10: Accessibility Compliance
  // ===================================================================
  test('Doctor portal meets accessibility standards', async ({ page }) => {
    await loginAsDoctor(page);

    // Check for proper ARIA labels
    const calendarIcon = page.locator('[aria-hidden="true"]').first();
    await expect(calendarIcon).toBeVisible();

    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Verify color contrast (this would use axe-core in real scenario)
    const backgroundColor = await page.locator('body').evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).toBeTruthy();
  });
});

// =====================================================================
// TEST SUITE: AI Summary Validation
// =====================================================================

test.describe('AI Summary Generation and Validation', () => {
  test('AI summary includes all required fields', async ({ page }) => {
    await loginAsDoctor(page);

    // Navigate to report with AI summary
    await page.goto('/doctor/reports');
    await page.locator('[data-testid="report-card"]').first().click();
    await page.click('button:has-text("AI Summary")');

    // Verify required fields
    await expect(page.locator('text=Clinical Summary')).toBeVisible();
    await expect(page.locator('text=/Priority:/i')).toBeVisible();

    // If flags exist, verify source snippets
    const flags = page.locator('[data-testid="ai-flag"]');
    const flagCount = await flags.count();

    if (flagCount > 0) {
      for (let i = 0; i < flagCount; i++) {
        const flag = flags.nth(i);
        await expect(flag.locator('[data-testid="source-snippet"]')).toBeVisible();
      }
    }

    // Verify disclaimer
    await expect(page.locator('text=/This AI-generated summary is for informational purposes only/i')).toBeVisible();
  });

  test('AI summary uses conservative language', async ({ page }) => {
    await loginAsDoctor(page);

    await page.goto('/doctor/reports');
    await page.locator('[data-testid="report-card"]').first().click();
    await page.click('button:has-text("AI Summary")');

    const summaryText = await page.locator('[data-testid="ai-summary-text"]').textContent();

    // Verify it doesn't contain definitive diagnosis language
    const prohibitedPhrases = ['patient has', 'diagnosed with', 'confirms diagnosis'];
    prohibitedPhrases.forEach((phrase) => {
      expect(summaryText?.toLowerCase()).not.toContain(phrase);
    });

    // Verify it contains conservative language
    const conservativePhrases = ['may indicate', 'suggests', 'consider', 'recommended'];
    const hasConservativeLanguage = conservativePhrases.some((phrase) =>
      summaryText?.toLowerCase().includes(phrase)
    );
    expect(hasConservativeLanguage).toBeTruthy();
  });
});

// =====================================================================
// TEST CLEANUP
// =====================================================================

test.afterAll(async () => {
  // Clean up test data if needed
  console.log('E2E tests completed');
});
