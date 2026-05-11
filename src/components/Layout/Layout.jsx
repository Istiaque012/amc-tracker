import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout({ children, user, signOut }) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar user={user} signOut={signOut} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
