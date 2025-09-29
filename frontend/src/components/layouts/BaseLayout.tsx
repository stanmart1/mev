import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.tsx'
import { Header } from './Header.tsx'

export function BaseLayout() {
  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="flex h-full">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}