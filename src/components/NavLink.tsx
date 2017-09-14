import { NavLink as RSNavLink } from 'reactstrap';
import { NavLink as RRNavLink } from 'react-router-dom';
import * as React from 'react';

interface NavLinkProps {
  to: string;
}

export class NavLink extends React.Component<NavLinkProps, {}> {
  constructor(props: NavLinkProps) {
    super(props);
  }

  render() {
    let InternalNav: any = RSNavLink;
    return (
      <InternalNav
        to={this.props.to}
        activeClassName="active"
        tag={RRNavLink}
        exact={true}
      >
        {this.props.children}
      </InternalNav>
    );
  }
}