# Dev Stage ($0-minimizing) Baseline

This setup keeps always-on cost close to zero additional overhead by using:
- single EC2 instance
- SSM for remote execution
- no ALB / NAT Gateway / VPC interface endpoints (phase 1)

## Current baseline applied
- Instance bootstrap script installed at: `/usr/local/bin/deploy-3dbyte-tech-store.sh`
- Systemd unit created: `3dbyte-tech-store-deploy.service`
- Repo path on instance: `/opt/3dbyte-tech-store`

## GitHub Actions deploy workflow
Workflow file: `.github/workflows/deploy-dev-stage.yml`

### Required GitHub repo secrets
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (example: `ap-southeast-2`)
- `AWS_INSTANCE_ID` (current: `i-0ed5044f5aca7f199`)

### Minimum IAM policy for deploy user
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:GetCommandInvocation"
      ],
      "Resource": "*"
    }
  ]
}
```

## Manual deploy test (from AWS CLI)
```bash
aws ssm send-command \
  --instance-ids i-0ed5044f5aca7f199 \
  --document-name AWS-RunShellScript \
  --parameters commands='["/usr/local/bin/deploy-3dbyte-tech-store.sh"]'
```

## Cost notes
- Keeps infra simple and cheap, but not hardened to production level yet.
- Public IP still exists in phase 1.
- Next hardening step: Cloudflare edge restriction + tighter SG ingress.
