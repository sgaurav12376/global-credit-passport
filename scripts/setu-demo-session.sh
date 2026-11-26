#!/usr/bin/env bash
# Run from a Mac Terminal; no Setu credential required.
set -eu -o pipefail
region=ap-south-1
account=420030147156
subnet=${SETU_SUBNET_ID:-subnet-0fae1d1ac7264d779}
keyname=${SETU_KEY_NAME:-setu-sandbox-mumbai}
export SETU_SSH_KEY=${SETU_SSH_KEY:-"$HOME/Downloads/setu-sandbox-mumbai.pem"}
mode=${2:-browser}
ttl=${SETU_SESSION_MINUTES:-60}
fail(){ echo "$*" >&2; exit 1; }
case "${1:-plan}" in plan|start) ;; *) fail "Use plan or start, optionally followed by browser or backend.";; esac
case "$mode" in browser|backend) ;; *) fail "Use browser or backend.";; esac
[[ "$ttl" =~ ^[1-9][0-9]?$ && "$ttl" -ge 5 ]] || fail "SETU_SESSION_MINUTES must be 5–99."
echo "One temporary t3.micro in Mumbai; $mode tunnel; guest shutdown after $ttl minutes."
if [[ "${1:-plan}" != start ]]; then echo "Plan only. No AWS calls made."; exit 0; fi
tunnel="$(dirname "$0")/setu-mumbai-tunnel.sh"
[[ -r "$tunnel" && -r "$SETU_SSH_KEY" ]] || fail "Missing tunnel helper or PEM."
awsr(){ aws --region "$region" --no-cli-pager "$@"; }
[[ "$(awsr sts get-caller-identity --query Account --output text)" = "$account" ]] || fail "Wrong AWS account."
vpc=$(awsr ec2 describe-subnets --subnet-ids "$subnet" --query 'Subnets[0].VpcId' --output text)
sg=${SETU_SECURITY_GROUP_ID:-}
if [[ -z "$sg" ]]; then
  sg=$(awsr ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpc" Name=group-name,Values=launch-wizard-1 --query 'SecurityGroups[0].GroupId' --output text)
fi
[[ "$sg" =~ ^sg-[0-9a-f]+$ ]] || fail "Set SETU_SECURITY_GROUP_ID to your SSH-only Mumbai group."
myip=$(curl --noproxy '*' -fsS --max-time 10 https://checkip.amazonaws.com)
rules=$(awsr ec2 describe-security-groups --group-ids "$sg" --output json)
printf '%s' "$rules" | python3 -c '
import json,sys,ipaddress
g=json.load(sys.stdin)["SecurityGroups"][0]; ip=str(ipaddress.IPv4Address(sys.argv[1]))+"/32"
p=g["IpPermissions"]; ok=g["VpcId"]==sys.argv[2] and len(p)==1
if ok:
 r=p[0]; ok=(r.get("IpProtocol")=="tcp" and r.get("FromPort")==r.get("ToPort")==22 and
 [i["CidrIp"] for i in r.get("IpRanges",[])]==[ip] and not any(r.get(k) for k in ("Ipv6Ranges","PrefixListIds","UserIdGroupPairs")))
sys.exit(0 if ok else 1)' "$myip" "$vpc" || fail "Use a dedicated group allowing only SSH from your current public IPv4 /32. No instance launched."
ami=$(awsr ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --query Parameter.Value --output text)
[[ "$ami" =~ ^ami-[0-9a-f]+$ ]] || fail "Cannot resolve Amazon Linux image."
active=$(awsr ec2 describe-instances --filters Name=tag:Application,Values=gcp-setu-demo Name=instance-state-name,Values=pending,running,stopping,stopped --query 'Reservations[].Instances[].InstanceId' --output text)
[[ -z "$active" || "$active" = None ]] || fail "An existing demo instance needs review: $active. No instance launched."
token=$(uuidgen | tr '[:upper:]' '[:lower:]')
id=''
cleanup(){
  rc=$?; trap - EXIT; trap '' INT TERM HUP
  if [[ ! "$id" =~ ^i-[0-9a-f]+$ ]]; then
    id=$(awsr ec2 describe-instances --filters "Name=client-token,Values=$token" "Name=tag:Session,Values=$token" --query 'Reservations[].Instances[].InstanceId' --output text) || id=''
  fi
  if [[ "$id" =~ ^i-[0-9a-f]+$ ]]; then
    echo "Terminating session instance $id..."
    if awsr ec2 terminate-instances --instance-ids "$id" >/dev/null && awsr ec2 wait instance-terminated --instance-ids "$id"; then
      echo "Confirmed terminated: $id"
    else echo "Termination NOT confirmed. Check Mumbai EC2 for $id." >&2; rc=1; fi
  else echo "No unique instance ID confirmed. Check Mumbai for tag Session=$token." >&2; rc=1; fi
  exit "$rc"
}
echo "Session tag: $token. Close with Ctrl+C when the demo ends."
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP
id=$(awsr ec2 run-instances --client-token "$token" --count 1 --image-id "$ami" --instance-type t3.micro \
  --key-name "$keyname" --subnet-id "$subnet" --security-group-ids "$sg" --associate-public-ip-address \
  --metadata-options HttpTokens=required,HttpEndpoint=enabled --instance-initiated-shutdown-behavior terminate \
  --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=8,VolumeType=gp3,Encrypted=true,DeleteOnTermination=true}' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=setu-sandbox-demo},{Key=Application,Value=gcp-setu-demo},{Key=Session,Value=$token}]" \
  --user-data "$(printf '#!/bin/bash\n/usr/sbin/shutdown -P +%s\n' "$ttl")" \
  --query 'Instances[0].InstanceId' --output text)
[[ "$id" =~ ^i-[0-9a-f]+$ ]] || fail "Launch returned an unexpected ID."
echo "Launched $id; waiting for EC2 status checks."
awsr ec2 wait instance-status-ok --instance-ids "$id"
ip=$(awsr ec2 describe-instances --instance-ids "$id" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "Mumbai demo host: $ip. Backend mode only forwards to a service you have deployed."
bash "$tunnel" "$ip" "$mode"
