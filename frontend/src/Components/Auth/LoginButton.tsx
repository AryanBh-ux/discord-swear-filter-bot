export default function LoginButton() {
  return (
    <button
      onClick={()=>window.location.href='/auth/discord'}
      className="btn-primary"
    >
      Login with Discord
    </button>
  )
}
