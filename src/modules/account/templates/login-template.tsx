"use client"

import Login from "@modules/account/components/login"

// Magic-link login only (stage 2c-3, D1: password login and sign-up retired).
const LoginTemplate = () => {
  return (
    <div className="w-full">
      <Login />
    </div>
  )
}

export default LoginTemplate
