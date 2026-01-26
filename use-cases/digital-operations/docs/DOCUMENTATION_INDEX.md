# Documentation Index

## Plotting and Visualization Documentation

Complete documentation suite for creating, testing, and troubleshooting charts and visualizations in the application.

### 📚 Main Guides

#### [Plotting and Visualization Guide](PLOTTING_AND_VISUALIZATION_GUIDE.md)
**Comprehensive developer guide covering:**
- How plotting works (architecture and components)
- Supported visualization libraries (Plotly.js, Chart.js, etc.)
- Creating visualizations (templates and examples)
- HTML preprocessing pipeline (detailed explanation)
- Troubleshooting (common issues and solutions)
- Testing (automated and manual testing)
- Best practices (design, performance, security)
- Advanced topics (custom preprocessing, debugging)

**When to use:** First-time setup, understanding the system, comprehensive reference

---

#### [Plotting Quick Reference](PLOTTING_QUICK_REFERENCE.md)
**Quick reference card with:**
- Quick start template
- Common chart types (line, bar, pie, gauge)
- Testing commands
- Troubleshooting checklist
- Common patterns
- Performance tips
- File locations

**When to use:** Daily development, quick lookups, common tasks

---

#### [Plotting Troubleshooting Flowchart](PLOTTING_TROUBLESHOOTING_FLOWCHART.md)
**Interactive troubleshooting guide with:**
- Decision trees for common issues
- Chart not displaying flowchart
- Height issues diagnosis
- Variable conflicts resolution
- Performance issues analysis
- Streaming issues guide
- Security/sandbox problems
- Quick diagnostic commands
- Common error messages and fixes

**When to use:** Debugging issues, systematic problem solving

---

### 🔧 Technical Documentation

#### [Fix Summary](../scripts/FIX_SUMMARY.md)
**Recent bug fix documentation:**
- Problem identification (iframe detection bug)
- Solution implementation (iteration-based approach)
- Test results (8/8 tests passing)
- Processing details (complete vs incomplete iframes)
- Example transformations
- Performance metrics

**When to use:** Understanding recent changes, reference for similar issues

---

### 🧪 Testing

#### Test Script: `scripts/testHtmlPreprocessing.ts`
**Automated test suite that validates:**
- Iframe count preservation
- Complete iframe processing
- Incomplete iframe replacement
- Height attribute removal
- Sandbox attribute addition
- Newline removal from srcdoc
- Auto-resize script injection
- Script IIFE wrapping

**Run with:**
```bash
npx tsx scripts/testHtmlPreprocessing.ts
```

**Expected output:** `🎉 All tests passed!` (8/8 tests)

---

### 📁 Example Files

#### `tmp/sample_message.md`
**Sample visualizations including:**
- Multi-chart dashboards
- Production rate distributions
- Time series with multiple axes
- Geographic data (township-ranges)
- Gauge charts
- Trend analysis charts

**Use for:** Reference examples, testing preprocessing, visual inspiration

#### `tmp/sample_message_processed.md`
**Processed output showing:**
- Compressed HTML (no newlines)
- IIFE-wrapped scripts
- Injected auto-resize code
- Sandbox attributes
- Removed height attributes

**Use for:** Verifying preprocessing, debugging output, understanding transformations

---

## Quick Navigation

### By Task

**I want to create a new chart:**
1. Start with [Quick Reference](PLOTTING_QUICK_REFERENCE.md) for templates
2. Check [Main Guide](PLOTTING_AND_VISUALIZATION_GUIDE.md) for detailed examples
3. Test with `npx tsx scripts/testHtmlPreprocessing.ts`

**I have a chart that's not working:**
1. Use [Troubleshooting Flowchart](PLOTTING_TROUBLESHOOTING_FLOWCHART.md)
2. Check browser console for errors
3. Run test suite to verify preprocessing
4. Consult [Main Guide](PLOTTING_AND_VISUALIZATION_GUIDE.md) troubleshooting section

**I need to understand how it works:**
1. Read [Main Guide](PLOTTING_AND_VISUALIZATION_GUIDE.md) architecture section
2. Review [Fix Summary](../scripts/FIX_SUMMARY.md) for recent changes
3. Examine `src/lib/htmlPreprocessing.ts` source code
4. Look at examples in `tmp/sample_message.md`

**I'm modifying the preprocessing logic:**
1. Understand current implementation in [Main Guide](PLOTTING_AND_VISUALIZATION_GUIDE.md)
2. Review [Fix Summary](../scripts/FIX_SUMMARY.md) for context
3. Make changes to `src/lib/htmlPreprocessing.ts`
4. Run test suite: `npx tsx scripts/testHtmlPreprocessing.ts`
5. Update documentation if behavior changes

---

## Documentation Standards

### When to Update Documentation

**Update immediately when:**
- Changing preprocessing behavior
- Adding new features
- Fixing bugs that affect usage
- Discovering new issues or solutions

**Update eventually when:**
- Adding new chart types or libraries
- Improving performance
- Enhancing security
- Optimizing code

### Documentation Files to Update

| Change Type | Files to Update |
|------------|----------------|
| Preprocessing logic | Main Guide, Fix Summary, Test Script |
| New chart type | Quick Reference, Main Guide examples |
| Bug fix | Troubleshooting Flowchart, Fix Summary |
| Performance improvement | Main Guide best practices |
| Security enhancement | Main Guide security section |
| New test | Test Script, Main Guide testing section |

---

## Related Documentation

### Project Documentation
- [README.md](../README.md) - Project overview and setup
- [Demo Script](script.md) - Demo scenarios and prompts
- [Project Structure](PROJECT_STRUCTURE.md) - Codebase organization

### External Resources
- [Plotly.js Documentation](https://plotly.com/javascript/)
- [MDN: iframe element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## Contributing to Documentation

### Adding New Documentation

1. **Choose appropriate location:**
   - `docs/` for user-facing guides
   - `scripts/` for technical implementation details
   - `tmp/` for examples and test data

2. **Follow naming conventions:**
   - Use UPPERCASE for main documentation files
   - Use descriptive names (e.g., `PLOTTING_GUIDE.md` not `guide.md`)
   - Include topic in filename

3. **Update this index:**
   - Add entry in appropriate section
   - Include brief description
   - Link to new document

4. **Cross-reference:**
   - Link from related documents
   - Update README.md if user-facing
   - Add to quick navigation if applicable

### Documentation Style Guide

**Structure:**
- Use clear headings (H1 for title, H2 for sections, H3 for subsections)
- Include table of contents for long documents
- Add "When to use" sections for guides
- Provide examples for all concepts

**Content:**
- Write for developers (technical but clear)
- Include code examples with syntax highlighting
- Use checklists for procedures
- Add troubleshooting sections
- Include command examples with expected output

**Formatting:**
- Use code blocks with language specification
- Use tables for comparisons
- Use lists for steps or options
- Use blockquotes for important notes
- Use emoji sparingly for visual markers (✅ ❌ 📚 🔧 etc.)

---

## Version History

### 2024-01-23: Initial Documentation Suite
- Created comprehensive plotting and visualization guide
- Added quick reference card
- Created troubleshooting flowchart
- Documented recent preprocessing fix
- Created this index

**Files created:**
- `docs/PLOTTING_AND_VISUALIZATION_GUIDE.md`
- `docs/PLOTTING_QUICK_REFERENCE.md`
- `docs/PLOTTING_TROUBLESHOOTING_FLOWCHART.md`
- `docs/DOCUMENTATION_INDEX.md`
- `scripts/FIX_SUMMARY.md`
- `scripts/testHtmlPreprocessing.ts`

**Files updated:**
- `README.md` - Added documentation links
- `src/lib/htmlPreprocessing.ts` - Fixed iframe detection bug

---

## Feedback and Improvements

To suggest improvements to this documentation:
1. Identify the specific document and section
2. Describe the issue or suggestion
3. Provide examples if applicable
4. Consider contributing the improvement directly

Good documentation is a team effort!


---

## Implementation & Architecture Documentation

### [GraphQL Transport Implementation](GRAPHQL_TRANSPORT_IMPLEMENTATION.md)
**GraphQL-based streaming transport for AWS Amplify:**
- Problem statement (Amplify timeout limitations)
- Solution architecture (GraphQL subscriptions)
- Implementation guide (schema, Lambda, transport)
- Benefits and testing checklist

**When to use:** Understanding streaming architecture, implementing GraphQL transport

---

### [MCP Integration Plan](MCP_INTEGRATION_PLAN.md)
**Model Context Protocol integration guide:**
- MCP server integration architecture
- OAuth authentication setup
- Tool configuration and type safety
- Testing and deployment strategies

**When to use:** Integrating MCP servers, setting up tool calling

---

### [S3 Filesystem MCP Project Plan](S3_FILESYSTEM_MCP_PROJECT_PLAN.md)
**S3-backed filesystem MCP server:**
- Best practices for file system access
- S3 as filesystem architecture
- Security and IAM configuration
- Complete implementation guide

**When to use:** Building S3-backed MCP servers, understanding file system security

---

### [Map Layer Refactor Summary](MAP_LAYER_REFACTOR_SUMMARY.md)
**Query-based map layer implementation:**
- Schema changes (removed geoJsonData field)
- Data flow architecture
- Migration notes and benefits

**When to use:** Understanding map layer architecture, working with Athena queries
