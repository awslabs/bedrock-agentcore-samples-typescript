chore: update bedrock-agentcore to ^0.2.0

## Description

- Update all 10 sample packages to use published `bedrock-agentcore@^0.2.0` instead of `^0.1.1`
- Fix tsc build script paths in 4 runtime packages to use standard `tsc` instead of explicit `./node_modules/typescript/bin/tsc`

## Type of Change

- [x] Configuration/tooling update

## Related Issues

None

## Checklist

- [x] I have read the [CONTRIBUTING](../CONTRIBUTING.md) guidelines
- [x] My code follows the existing style patterns
- [x] I have run `npm run validate` locally and it passes
- [x] I have added/updated documentation as needed
- [x] I have tested my changes locally

## Testing

Verified packages install correctly with updated dependency version.

## Additional Notes

None
