#!/usr/bin/env python3
"""
UX Testing Report Analyzer
Helps parse and summarize UX test findings
"""

import re
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

def parse_markdown_table(content: str, table_marker: str) -> List[Dict[str, str]]:
    """Extract issues from markdown table in report"""
    issues = []
    in_table = False
    headers = []
    
    for line in content.split('\n'):
        if table_marker in line:
            in_table = True
            continue
        
        if in_table:
            if line.startswith('|') and 'Issue' in line:
                headers = [h.strip() for h in line.split('|')[1:-1]]
                continue
            elif line.startswith('|---'):
                continue
            elif line.startswith('|') and any(c.strip() for c in line.split('|')[1:-1]):
                values = [v.strip() for v in line.split('|')[1:-1]]
                if len(values) == len(headers):
                    issues.append(dict(zip(headers, values)))
            elif not line.strip().startswith('|'):
                in_table = False
    
    return issues

def count_scenarios(content: str) -> Dict[str, int]:
    """Count pass/fail scenarios"""
    pass_count = content.count('☑ Pass') + content.count('[x] Pass')
    fail_count = content.count('☑ Fail') + content.count('[x] Fail')
    total = 6  # We have 6 scenarios
    
    return {
        'pass': pass_count,
        'fail': fail_count,
        'not_tested': total - (pass_count + fail_count),
        'total': total
    }

def analyze_report(report_path: Path) -> Dict[str, Any]:
    """Analyze completed UX test report"""
    if not report_path.exists():
        return {'error': 'Report not found', 'path': str(report_path)}
    
    content = report_path.read_text()
    
    # Parse different sections
    p0_issues = parse_markdown_table(content, '### P0 - Critical')
    p1_issues = parse_markdown_table(content, '### P1 - High')
    p2_issues = parse_markdown_table(content, '### P2 - Medium')
    
    scenarios = count_scenarios(content)
    
    # Check for overall assessment
    production_ready = '☑ Production Ready' in content or '[x] Production Ready' in content
    needs_work = '☑ Needs Work' in content or '[x] Needs Work' in content
    major_issues = '☑ Major Issues' in content or '[x] Major Issues' in content
    
    return {
        'scenarios': scenarios,
        'issues': {
            'p0': len([i for i in p0_issues if i.get('Issue', '').strip() and i['Issue'] != '1.']),
            'p1': len([i for i in p1_issues if i.get('Issue', '').strip() and i['Issue'] != '1.']),
            'p2': len([i for i in p2_issues if i.get('Issue', '').strip() and i['Issue'] != '1.']),
        },
        'assessment': {
            'production_ready': production_ready,
            'needs_work': needs_work,
            'major_issues': major_issues,
        },
        'p0_details': p0_issues,
        'p1_details': p1_issues,
        'p2_details': p2_issues,
    }

def generate_summary(analysis: Dict[str, Any]) -> str:
    """Generate executive summary"""
    if 'error' in analysis:
        return f"❌ {analysis['error']}: {analysis['path']}"
    
    scenarios = analysis['scenarios']
    issues = analysis['issues']
    assessment = analysis['assessment']
    
    summary = []
    summary.append("=" * 60)
    summary.append("UX TESTING SUMMARY")
    summary.append("=" * 60)
    summary.append("")
    
    # Scenarios
    summary.append(f"📊 SCENARIOS: {scenarios['pass']}/{scenarios['total']} passed")
    summary.append(f"   ✅ Pass: {scenarios['pass']}")
    summary.append(f"   ❌ Fail: {scenarios['fail']}")
    summary.append(f"   ⏭️  Not tested: {scenarios['not_tested']}")
    summary.append("")
    
    # Issues
    total_issues = issues['p0'] + issues['p1'] + issues['p2']
    summary.append(f"🐛 ISSUES FOUND: {total_issues}")
    summary.append(f"   🔴 P0 (Critical): {issues['p0']}")
    summary.append(f"   🟠 P1 (High): {issues['p1']}")
    summary.append(f"   🟡 P2 (Medium): {issues['p2']}")
    summary.append("")
    
    # Assessment
    summary.append("📋 OVERALL ASSESSMENT:")
    if assessment['production_ready']:
        summary.append("   ✅ Production Ready")
    elif assessment['major_issues']:
        summary.append("   ❌ Major Issues - Not ready for production")
    elif assessment['needs_work']:
        summary.append("   ⚠️  Needs Work - Address issues before launch")
    else:
        summary.append("   ⏳ Not yet assessed")
    summary.append("")
    
    # Critical issues detail
    if issues['p0'] > 0:
        summary.append("🚨 CRITICAL ISSUES (P0):")
        for i, issue in enumerate(analysis['p0_details'][:3], 1):
            if issue.get('Issue', '').strip() and issue['Issue'] not in ['1.', '2.']:
                summary.append(f"   {i}. {issue.get('Issue', 'Unknown')}")
        summary.append("")
    
    # Recommendations
    summary.append("💡 NEXT STEPS:")
    if issues['p0'] > 0:
        summary.append("   1. Fix all P0 issues immediately (blocks release)")
    if issues['p1'] > 0:
        summary.append(f"   2. Schedule {issues['p1']} P1 issues for next sprint")
    if scenarios['fail'] > 0:
        summary.append(f"   3. Re-test {scenarios['fail']} failed scenarios after fixes")
    summary.append("   4. Review recommendations in report")
    summary.append("   5. Create tickets for prioritized issues")
    summary.append("")
    
    summary.append("=" * 60)
    summary.append(f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    summary.append("=" * 60)
    
    return "\n".join(summary)

def main():
    """Main entry point"""
    print("\n🔍 UX Testing Report Analyzer\n")
    
    # Find report file
    report_path = Path(__file__).parent / 'UX_TEST_REPORT.md'
    
    print(f"Analyzing: {report_path}\n")
    
    # Analyze
    analysis = analyze_report(report_path)
    
    # Generate summary
    summary = generate_summary(analysis)
    print(summary)
    
    # Save summary
    summary_path = Path(__file__).parent / 'UX_TEST_SUMMARY.txt'
    summary_path.write_text(summary)
    print(f"\n✅ Summary saved to: {summary_path}")
    
    # Print detailed issues if any P0/P1 found
    if analysis.get('issues', {}).get('p0', 0) > 0 or analysis.get('issues', {}).get('p1', 0) > 0:
        print("\n" + "=" * 60)
        print("DETAILED ISSUES")
        print("=" * 60)
        
        if analysis.get('p0_details'):
            print("\n🔴 P0 CRITICAL:")
            for issue in analysis['p0_details']:
                if issue.get('Issue', '').strip() and issue['Issue'] not in ['1.', '2.']:
                    print(f"\n  Issue: {issue.get('Issue', 'N/A')}")
                    print(f"  Repro: {issue.get('Repro Steps', 'N/A')}")
                    print(f"  Expected: {issue.get('Expected Behavior', 'N/A')}")
                    print(f"  Current: {issue.get('Current Behavior', 'N/A')}")
                    print(f"  Fix: {issue.get('Suggested Fix', 'N/A')}")
        
        if analysis.get('p1_details'):
            print("\n🟠 P1 HIGH:")
            for issue in analysis['p1_details']:
                if issue.get('Issue', '').strip() and issue['Issue'] not in ['1.', '2.']:
                    print(f"\n  Issue: {issue.get('Issue', 'N/A')}")
                    print(f"  Fix: {issue.get('Suggested Fix', 'N/A')}")

if __name__ == '__main__':
    main()
