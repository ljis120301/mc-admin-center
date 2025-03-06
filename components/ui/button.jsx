import React from 'react';
import styled from 'styled-components';

const Button = ({ children, onClick, disabled, type = 'button', className, variant = 'default' }) => {
  return (
    <StyledWrapper>
      <button 
        onClick={onClick} 
        disabled={disabled} 
        type={type}
        className={`${className} ${variant}`}
      >
        {children}
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  button {
    padding: 6px 12px;
    font-size: 14px;
    background-color: #333;
    color: #fff;
    text-shadow: 0 2px 0 rgb(0 0 0 / 25%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border: none;
    z-index: 1;
    user-select: none;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    white-space: unset;
    text-decoration: none;
    font-weight: 900;
    transition: all 0.7s cubic-bezier(0,.8,.26,.99);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.green {
      background-color: #4CAF50;
    }

    &.red {
      background-color: #B71C1C;
    }

    &.server-start {
      background-color: #4CAF50;
    }

    &.server-stop {
      background-color: #B71C1C;
    }

    &.server-restart {
      background-color: #FFA000;
    }

    &.server-refresh {
      background-color: #333;
    }
  }

  button:before {
    position: absolute;
    pointer-events: none;
    top: 0;
    left: 0;
    display: block;
    width: 100%;
    height: 100%;
    content: '';
    transition: .7s cubic-bezier(0,.8,.26,.99);
    z-index: -1;
    box-shadow: 0 -4px rgb(0 0 0 / 50%) inset, 0 4px rgb(255 255 255 / 20%) inset, -4px 0 rgb(255 255 255 / 20%) inset, 4px 0 rgb(0 0 0 / 50%) inset;
  }

  button:after {
    position: absolute;
    pointer-events: none;
    top: 0;
    left: 0;
    display: block;
    width: 100%;
    height: 100%;
    content: '';
    box-shadow: 0 4px 0 0 rgb(0 0 0 / 15%);
    transition: .7s cubic-bezier(0,.8,.26,.99);
  }

  button:hover:before {
    box-shadow: 0 -4px rgb(0 0 0 / 50%) inset, 0 4px rgb(255 255 255 / 20%) inset, -4px 0 rgb(255 255 255 / 20%) inset, 4px 0 rgb(0 0 0 / 50%) inset;
  }

  button:hover:after {
    box-shadow: 0 4px 0 0 rgb(0 0 0 / 15%);
  }

  button:active {
    transform: translateY(4px);
  }

  button:active:after {
    box-shadow: 0 0px 0 0 rgb(0 0 0 / 15%);
  }`;
export default Button;

