#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { glob } from 'glob';

interface AuditIssue {
    category: 'security' | 'quality' | 'typescript' | 'reliability' | 'performance';
    severity: 'critical' | 'high' | 'medium' | 'low';
    file: string;
    line: number;
    issue: string;
    context?: string;
}

interface AuditResult {
    timestamp: string;
    summary: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        byCategory: Record<string, number>;
    };
    issues: AuditIssue[];
}

const SRC_DIR = join(process.cwd(), 'src');

/**
 * Scan for hardcoded secrets and dangerous patterns
 */
function scanSecurity(filePath: string, content: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
        // Check for hardcoded API keys/secrets
        if (/API_KEY\s*=\s*['"][^'"]+['"]/.test(line) || /SECRET\s*=\s*['"][^'"]+['"]/.test(line)) {
            issues.push({
                category: 'security',
                severity: 'critical',
                file: filePath,
                line: idx + 1,
                issue: 'Hardcoded secret detected',
                context: line.trim()
            });
        }

        // Check for eval() usage
        if (/\beval\s*\(/.test(line)) {
            issues.push({
                category: 'security',
                severity: 'high',
                file: filePath,
                line: idx + 1,
                issue: 'Dangerous eval() usage detected',
                context: line.trim()
            });
        }

        // Check for environment variables without fallbacks
        const envMatch = line.match(/process\.env\.([A-Z_]+)(?!\s*\|\|)/);
        if (envMatch && !line.includes('??') && !line.includes('||')) {
            issues.push({
                category: 'security',
                severity: 'medium',
                file: filePath,
                line: idx + 1,
                issue: `Environment variable ${envMatch[1]} used without fallback`,
                context: line.trim()
            });
        }
    });

    return issues;
}

/**
 * Scan for TODO/FIXME comments
 */
function scanQuality(filePath: string, content: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
        if (/\/\/\s*(TODO|FIXME)/i.test(line)) {
            issues.push({
                category: 'quality',
                severity: 'low',
                file: filePath,
                line: idx + 1,
                issue: 'TODO/FIXME comment found',
                context: line.trim()
            });
        }
    });

    return issues;
}

/**
 * Scan for explicit 'any' types
 */
function scanTypeScript(filePath: string, content: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
        // Skip catch blocks (error: any is acceptable)
        if (/catch\s*\(\s*\w+\s*:\s*any\s*\)/.test(line)) {
            return;
        }

        // Check for explicit any types
        if (/:\s*any\b/.test(line) || /as\s+any\b/.test(line)) {
            issues.push({
                category: 'typescript',
                severity: 'medium',
                file: filePath,
                line: idx + 1,
                issue: 'Explicit "any" type usage',
                context: line.trim()
            });
        }
    });

    return issues;
}

/**
 * Scan for async functions without try/catch
 */
function scanReliability(filePath: string, content: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const lines = content.split('\n');

    // Find async function declarations
    const asyncFunctionRegex = /async\s+(function\s+\w+|[\w]+\s*\()/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (asyncFunctionRegex.test(line)) {
            // Check if there's a try/catch in the next 50 lines
            let hasTryCatch = false;
            let braceCount = 0;
            let started = false;

            for (let j = i; j < Math.min(i + 100, lines.length); j++) {
                const checkLine = lines[j];

                // Count braces to know when function ends
                if (checkLine.includes('{')) {
                    braceCount += (checkLine.match(/{/g) || []).length;
                    started = true;
                }
                if (checkLine.includes('}')) {
                    braceCount -= (checkLine.match(/}/g) || []).length;
                }

                if (/\btry\s*{/.test(checkLine)) {
                    hasTryCatch = true;
                    break;
                }

                // Function ended without try/catch
                if (started && braceCount === 0) {
                    break;
                }
            }

            // Check if function has await or external calls
            const functionBody = lines.slice(i, Math.min(i + 100, lines.length)).join('\n');
            const hasAwait = /\bawait\b/.test(functionBody);
            const hasFetch = /\bfetch\(/.test(functionBody);
            const hasApiCall = /\.(get|post|put|delete|patch)\(/.test(functionBody);

            if (!hasTryCatch && (hasAwait || hasFetch || hasApiCall)) {
                issues.push({
                    category: 'reliability',
                    severity: 'high',
                    file: filePath,
                    line: i + 1,
                    issue: 'Async function with external calls missing try/catch',
                    context: line.trim()
                });
            }
        }
    }

    return issues;
}

/**
 * Scan for synchronous file operations
 */
function scanPerformance(filePath: string, content: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const lines = content.split('\n');

    // Skip script files (they're allowed to use sync operations)
    if (filePath.includes('/scripts/')) {
        return issues;
    }

    lines.forEach((line, idx) => {
        // Check for synchronous file operations
        if (/fs\.(readFileSync|writeFileSync|readSync|writeSync|appendFileSync)/.test(line)) {
            issues.push({
                category: 'performance',
                severity: 'medium',
                file: filePath,
                line: idx + 1,
                issue: 'Synchronous file operation in non-script file',
                context: line.trim()
            });
        }
    });

    return issues;
}

/**
 * Main audit function
 */
async function runAudit(): Promise<AuditResult> {
    const allIssues: AuditIssue[] = [];

    try {
        // Find all TypeScript files in src/
        const files = await glob('**/*.{ts,tsx}', {
            cwd: SRC_DIR,
            ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**']
        });

        for (const file of files) {
            const filePath = join(SRC_DIR, file);
            const relPath = relative(process.cwd(), filePath);

            try {
                const content = readFileSync(filePath, 'utf-8');

                // Run all scans
                allIssues.push(...scanSecurity(relPath, content));
                allIssues.push(...scanQuality(relPath, content));
                allIssues.push(...scanTypeScript(relPath, content));
                allIssues.push(...scanReliability(relPath, content));
                allIssues.push(...scanPerformance(relPath, content));
            } catch (error) {
                console.error(`Error scanning ${relPath}:`, error);
            }
        }
    } catch (error) {
        console.error('Error during audit:', error);
        process.exit(1);
    }

    // Calculate summary
    const summary = {
        total: allIssues.length,
        critical: allIssues.filter(i => i.severity === 'critical').length,
        high: allIssues.filter(i => i.severity === 'high').length,
        medium: allIssues.filter(i => i.severity === 'medium').length,
        low: allIssues.filter(i => i.severity === 'low').length,
        byCategory: {
            security: allIssues.filter(i => i.category === 'security').length,
            quality: allIssues.filter(i => i.category === 'quality').length,
            typescript: allIssues.filter(i => i.category === 'typescript').length,
            reliability: allIssues.filter(i => i.category === 'reliability').length,
            performance: allIssues.filter(i => i.category === 'performance').length,
        }
    };

    return {
        timestamp: new Date().toISOString(),
        summary,
        issues: allIssues.sort((a, b) => {
            // Sort by severity first
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        })
    };
}

// Run the audit
runAudit()
    .then(result => {
        console.log(JSON.stringify(result, null, 2));

        // Exit with error code if critical issues found
        if (result.summary.critical > 0) {
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Audit failed:', error);
        process.exit(1);
    });
