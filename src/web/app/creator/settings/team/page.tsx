import React, { useState, useEffect } from 'react'; // react v18.0+
import { Metadata } from 'next'; // ^14.0.0
import { Users, UserPlus, X, Mail, CheckCircle } from 'lucide-react'; // v0.279.0
import { useForm } from 'react-hook-form'; // ^7.45.0
import { z } from 'zod'; // v3.22.0
import { zodResolver } from '@hookform/resolvers/zod'; // ^3.3.0

import PageHeader from '../../../../components/layout/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../../components/ui/Table';
import { Button } from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/Select';
import Badge from '../../../../components/ui/Badge';
import Checkbox from '../../../../components/ui/Checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../../components/forms/Form';
import useCreator from '../../../../hooks/useCreator';
import useToast from '../../../../hooks/useToast';
import { api } from '../../../../lib/api';
import { formatDate } from '../../../../lib/formatters';
import { TeamRole, Permission, InviteStatus } from '../../../../types/user';

/**
 * Exports metadata for the team settings page
 * @returns Metadata object containing title and description
 */
export const metadata: Metadata = {
  title: 'Team Settings',
  description: 'Manage your team members and their permissions.',
};

/**
 * Determines the appropriate badge styling based on team role
 * @param role TeamRole
 * @returns Badge variant name (default, secondary, etc.)
 */
const getRoleBadgeVariant = (role: TeamRole): string => {
  switch (role) {
    case TeamRole.OWNER:
      return 'default';
    case TeamRole.ADMIN:
      return 'secondary';
    case TeamRole.MEMBER:
      return 'outline';
    case TeamRole.VIEWER:
      return 'outline';
    default:
      return 'outline';
  }
};

/**
 * Determines the appropriate badge styling based on invite status
 * @param status InviteStatus
 * @returns Badge variant name (default, secondary, etc.)
 */
const getInviteStatusBadgeVariant = (status: InviteStatus): string => {
  switch (status) {
    case InviteStatus.PENDING:
      return 'secondary';
    case InviteStatus.ACCEPTED:
      return 'success';
    case InviteStatus.DECLINED:
      return 'destructive';
    case InviteStatus.EXPIRED:
      return 'destructive';
    default:
      return 'outline';
  }
};

// Define the schema for the invite form
const inviteFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  role: z.nativeEnum(TeamRole, {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
  permissions: z.array(z.nativeEnum(Permission)).optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

/**
 * Main component for the team settings page allowing creators to manage team members
 * @returns The rendered team settings page
 */
const TeamPage: React.FC = () => {
  // Use useCreator hook to access team data and refresh function
  const { creator, team, refreshCreatorData } = useCreator();

  // Use useToast hook for displaying notifications
  const { toast } = useToast();

  // Set up invite form state with validation schema using zod
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role: TeamRole.VIEWER,
      permissions: [],
    },
  });

  // Define function to send team invites
  const sendInvite = async (values: InviteFormValues) => {
    try {
      // Simulate API call to send invite
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Invite sent',
        description: `Invite sent to ${values.email} with role ${values.role}`,
      });
      inviteForm.reset();
    } catch (error) {
      toast({
        title: 'Failed to send invite',
        description: 'Please try again later.',
        type: 'error',
      });
    }
  };

  // Define function to revoke/cancel invites
  const cancelInvite = async (inviteId: string) => {
    try {
      // Simulate API call to cancel invite
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Invite cancelled',
        description: `Invite ${inviteId} cancelled successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to cancel invite',
        description: 'Please try again later.',
        type: 'error',
      });
    }
  };

  // Define function to remove team members
  const removeTeamMember = async (memberId: string) => {
    try {
      // Simulate API call to remove team member
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Team member removed',
        description: `Team member ${memberId} removed successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to remove team member',
        description: 'Please try again later.',
        type: 'error',
      });
    }
  };

  // Render page header with title and icon
  return (
    <div>
      <PageHeader
        title="Team Settings"
        description="Manage your team members and their permissions."
        breadcrumbs={[
          { label: 'Settings', href: '/creator/settings' },
          { label: 'Team', href: '/creator/settings/team', active: true },
        ]}
        actions={
          <Button onClick={() => inviteForm.handleSubmit(sendInvite)()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Team Member
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Render current team members table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage existing team members and their roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team?.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTeamMember(member.id)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Render pending invites table */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              Manage pending invitations to join your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team?.pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(invite.role)}>
                        {invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInviteStatusBadgeVariant(invite.status)}>
                        {invite.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelInvite(invite.id)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Render invite form with email input, role selector, and permission checkboxes */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Invite New Team Member</CardTitle>
          <CardDescription>
            Send an invitation to a new team member to join your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(sendInvite)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="team@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TeamRole.VIEWER}>Viewer</SelectItem>
                        <SelectItem value={TeamRole.MEMBER}>Member</SelectItem>
                        <SelectItem value={TeamRole.ADMIN}>Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Handle loading states appropriately */}
              <Button type="submit" disabled={inviteForm.formState.isSubmitting}>
                {inviteForm.formState.isSubmitting ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Send Invite
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamPage;