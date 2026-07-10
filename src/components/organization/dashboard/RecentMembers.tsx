// RecentMembers — UI scaffold. Compose real markup as the feature ships.
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const members = [
  {
    name: "Rahul Sharma",
    role: "Owner",
    department: "Engineering",
    online: true,
  },
  {
    name: "Ananya Singh",
    role: "Manager",
    department: "Marketing",
    online: true,
  },
  {
    name: "Aman Gupta",
    role: "Developer",
    department: "Engineering",
    online: false,
  },
  {
    name: "Priya Verma",
    role: "HR",
    department: "Human Resources",
    online: true,
  },
];

export const RecentMembers = () => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Team Members</h2>

          <span className="text-sm text-primary cursor-pointer">View all</span>
        </div>

        <div className="space-y-5">
          {members.map((member) => (
            <div key={member.name} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src="/placeholder.svg" />

                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                      member.online ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </div>

                <div>
                  <p className="font-semibold">{member.name}</p>

                  <p className="text-sm text-muted-foreground">{member.department}</p>
                </div>
              </div>

              <Badge>{member.role}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentMembers;
