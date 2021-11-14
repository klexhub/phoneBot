# phoneBot

This is a bot that can send you a text message when your asterisk save a new voice recording after a call. This is very helpful for people and teams that use discord for communication. You can share and listen to audio files directly from discord.
This safe you and your team time and effort.

This bot will login to the asterisk server over `sftp` and try to download the file. If the file is not found, it will try to download it for 10 times.
A discord webhook message with the audio file and a short embed message with call meta data will be send to the discord webhook.

![](/images/example.png)

## Kubernetes

We use this package internally in our kubernetes cluster. (`dev01`)
The deployment is automatically created and will triggerd with GitHub actions on each commit to master branch.

Before ensure, that all credentials are set correctly in the `.env` file.
You can easy create a kuberntes secret based on the env file with following command:

```
$ kubectl create secret generic klexhub-phonebot-env --from-env-file=.env
```

The SSH-Key for asterisk remote server is stored in a seperate secret, because we use this key for muliple deployments.

```
$ kubectl create secret generic sip-klex-ssh-key --from-file=SFTP_PRIVATE_KEY=./key.pem
```

> _Internal notice_: You need to permit AMI access to following ip addresses: `10.0.1.0/255.0.0.0&10.0.0.0/255.0.0.0` otherwise k8s pods don't get access to the ami interface.
