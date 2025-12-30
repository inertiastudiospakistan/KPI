# Fix "Access to XMLHttpRequest blocked by CORS policy" User Guide

The error you are seeing (`Access to XMLHttpRequest... blocked by CORS policy`) happens because your Firebase Storage bucket is not configured to allow file uploads from `localhost`.

To fix this, you need to set the CORS (Cross-Origin Resource Sharing) configuration on your specific storage bucket (`alis-953c4.firebasestorage.app`).

## Option 1: Using Google Cloud Shell (Easiest, No installation needed)

1. Open the [Google Cloud Shell](https://ssh.cloud.google.com/cloudshell/editor?project=alis-953c4).
2. Click the **"Open Data Terminal"** or just use the terminal window at the bottom.
3. Run the following two commands:

   ```bash
   echo '[{"origin": ["*"],"method": ["GET", "PUT", "POST", "DELETE", "HEAD"],"responseHeader": ["Content-Type", "x-goog-resumable"], "maxAgeSeconds": 3600}]' > cors.json
   
   gsutil cors set cors.json gs://alis-953c4.firebasestorage.app
   ```

4. Wait about 1 minute, then try the upload again in your local app. It should work immediately!

## Option 2: If you have `gsutil` installed locally

I have already created a `cors.json` file in your project root. You can simply run:

```bash
gsutil cors set cors.json gs://alis-953c4.firebasestorage.app
```
