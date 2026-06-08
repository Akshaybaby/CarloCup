import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: undefined;
  Teams: undefined;
  Groups: undefined;
  Fixtures: undefined;
  Knockout: undefined;
  Standings: undefined; // Points Table
  Statistics: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ResultsEntry: { fixtureId: string };
  PlayerEdit: { teamId: string; playerId?: string };
  AdminControls: undefined;
};
