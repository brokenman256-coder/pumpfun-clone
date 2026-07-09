import { CreateCoinForm } from '../components/CreateCoinForm'

export function CreateCoinPage() {
  return (
    <div className="mx-auto max-w-lg px-3 py-8 sm:px-4">
      <h1 className="mb-1 text-center text-2xl font-bold">create a coin</h1>
      <p className="mb-6 text-center text-sm text-[#8b8d97]">
        choose carefully — can&apos;t change these later
      </p>
      <CreateCoinForm />
    </div>
  )
}
