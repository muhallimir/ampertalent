import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, Search } from "lucide-react";
import Link from "next/link";

export default function EmptySavedJobs() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Bookmark className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No saved jobs yet</h3>
        <p className="text-gray-600 text-center mb-6">
          Start saving jobs you're interested in to keep track of them here.
        </p>
        <Link href="/seeker/jobs">
          <Button className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Browse Jobs</span>
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
