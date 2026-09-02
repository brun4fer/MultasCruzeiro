const baseUrl = process.env.DEPLOYMENT_URL
const password = process.env.ADMIN_TEST_PASSWORD

if (!baseUrl || !password) {
  throw new Error('DEPLOYMENT_URL and ADMIN_TEST_PASSWORD are required')
}

const publicSession = await fetch(`${baseUrl}/api/session`)
const publicSessionBody = await publicSession.json()
if (publicSession.status !== 200 || publicSessionBody.authenticated !== false) {
  throw new Error('Public request unexpectedly has administrator access')
}

const stateResponse = await fetch(`${baseUrl}/api/state`)
const state = await stateResponse.json()
const etag = stateResponse.headers.get('x-state-etag')
if (stateResponse.status !== 200 || !Array.isArray(state.people) || !etag) {
  throw new Error('Shared state is unavailable')
}

const forbiddenWrite = await fetch(`${baseUrl}/api/state`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(state)
})
if (forbiddenWrite.status !== 401) {
  throw new Error(`Public write returned ${forbiddenWrite.status}, expected 401`)
}

const loginResponse = await fetch(`${baseUrl}/api/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: baseUrl },
  body: JSON.stringify({ password })
})
const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0]
if (loginResponse.status !== 200 || !cookie) {
  throw new Error('Administrator login failed')
}

const adminSession = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: cookie } })
const adminSessionBody = await adminSession.json()
if (adminSession.status !== 200 || adminSessionBody.authenticated !== true) {
  throw new Error('Administrator session was not accepted')
}

const authorizedWrite = await fetch(`${baseUrl}/api/state`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Origin: baseUrl, Cookie: cookie, 'X-State-Etag': etag },
  body: JSON.stringify(state)
})
if (authorizedWrite.status !== 200) {
  throw new Error(`Administrator write returned ${authorizedWrite.status}`)
}

console.log(`Public read: OK (${state.people.length} members)`)
console.log('Public write blocked: OK')
console.log('Administrator login: OK')
console.log('Administrator write: OK')
