import { FC, useState } from "react";
import { Menu, Search, Bell, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopNavProps {
  toggleSidebar: () => void;
  onSearch?: (query: string) => void;
}

const TopNav: FC<TopNavProps> = ({ toggleSidebar, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 sm:px-6 md:px-8">
      <div className="flex items-center md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <h1 className="ml-2 text-lg font-semibold text-primary md:hidden">Wcofun DL</h1>
      </div>

      {/* Search */}
      <div className="flex items-center flex-1 ml-4 md:ml-0">
        <div className="flex-1 max-w-md">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type="search"
                placeholder="Search for anime series or episodes"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="p-2 ml-2 text-gray-500 bg-white rounded-md hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Filter className="w-5 h-5" />
        </Button>
      </div>

      {/* User Menu */}
      <div className="hidden md:flex md:items-center">
        <Button
          variant="ghost"
          size="sm"
          className="p-1 mr-4 text-gray-500 rounded-full hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Bell className="w-6 h-6" />
        </Button>
        <div className="flex items-center justify-center ml-2 text-sm bg-gray-100 rounded-full h-9 w-9">
          <span className="font-medium text-gray-700">U</span>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
