# JSON structured logs

![image](https://github.com/kaihendry/hello-javascript/assets/765871/dafa0a25-dc07-4048-ba76-83715e17fc04)

    Globals:
      Function:
        LoggingConfig:
          LogFormat: JSON

# AWS resources

<img src="https://s.natalian.org/2023-11-23/aws-resources.png">

# Log SSM parameter name

Can't figure this out! I don't want to wrap around the operation here...

<img src="https://s.natalian.org/2024-01-19/ssmOperation.png">

# Node version

Set in two places:

❯ grep nodejs template.yaml
Runtime: nodejs18.x
❯ grep version .github/composite-actions/install/action.yml
node-version: "20"
